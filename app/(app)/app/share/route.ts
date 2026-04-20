import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deviceLabelFromUA } from "@/lib/device";
import { fetchOG } from "@/lib/og";
import { isUrl } from "@/lib/utils";
import { assertSameOrigin } from "@/lib/security/same-origin";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB per file
const MAX_FILES = 10;

/** Same allow-list as the DB CHECK constraint on `file_mime`. */
const ALLOWED_MIMES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/zip",
  "application/json",
  "application/x-zip-compressed",
]);

function redirectWithError(req: Request, message: string): NextResponse {
  const url = new URL("/app", req.url);
  url.searchParams.set("shareError", message);
  return NextResponse.redirect(url);
}

/**
 * PWA share_target POST handler.
 * The manifest advertises `enctype: multipart/form-data` so shared text,
 * url, and files all arrive as form fields. We create drops directly,
 * then redirect to `/`.
 */
export async function POST(req: Request) {
  // Origin guard. PWA share_target POSTs have Sec-Fetch-Site: cross-site, but
  // browsers set Origin to "null" or omit it. We allow same-origin and the
  // top-level-navigation "none" case via assertSameOrigin.
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const deviceName = deviceLabelFromUA(req.headers.get("user-agent"));

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return redirectWithError(req, "Couldn't read shared content");
  }
  const title = (form.get("title") as string | null)?.trim() || "";
  const text = (form.get("text") as string | null)?.trim() || "";
  const urlField = (form.get("url") as string | null)?.trim() || "";
  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File)
    .slice(0, MAX_FILES);

  try {
    // 1) URL share
    if (urlField && isUrl(urlField)) {
      const og = await fetchOG(urlField);
      await supabase.from("canvus_drops").insert({
        user_id: user.id,
        type: "LINK",
        url: urlField,
        content: urlField,
        og_title: og.title ?? (title || null),
        og_desc: og.description,
        og_image: og.image,
        device_name: deviceName,
        tags: [],
      });
    }

    // 2) Text share (may include a title prefix)
    const combinedText = [title, text].filter(Boolean).join("\n").trim();
    if (!urlField && combinedText) {
      if (isUrl(combinedText)) {
        const og = await fetchOG(combinedText);
        await supabase.from("canvus_drops").insert({
          user_id: user.id,
          type: "LINK",
          url: combinedText,
          content: combinedText,
          og_title: og.title,
          og_desc: og.description,
          og_image: og.image,
          device_name: deviceName,
          tags: [],
        });
      } else {
        await supabase.from("canvus_drops").insert({
          user_id: user.id,
          type: "TEXT",
          content: combinedText,
          device_name: deviceName,
          tags: [],
        });
      }
    }

    // 3) File shares — stream straight to Supabase Storage under `<user_id>/<uuid>.<ext>`
    for (const f of files) {
      const rawMime = (f.type || "").toLowerCase();
      const isAllowedMime = ALLOWED_MIMES.has(rawMime);

      if (f.size > MAX_FILE_BYTES) {
        console.warn("[share] file too large", f.name, f.size);
        continue;
      }

      // If the MIME is not on the allow-list but the file is small and
      // looks text-like, degrade gracefully to a TEXT drop.
      if (!isAllowedMime) {
        const looksTextual =
          rawMime.startsWith("text/") ||
          rawMime === "application/javascript" ||
          rawMime === "application/xml" ||
          rawMime === "";
        if (looksTextual && f.size <= 100 * 1024) {
          try {
            const asText = await f.text();
            if (asText.trim()) {
              await supabase.from("canvus_drops").insert({
                user_id: user.id,
                type: "TEXT",
                content: asText.slice(0, 50_000),
                device_name: deviceName,
                tags: [],
              });
            }
          } catch {
            /* swallow */
          }
        } else {
          console.warn("[share] rejected mime", rawMime, f.name);
        }
        continue;
      }

      const ext =
        (f.name.split(".").pop() || extFromMime(rawMime))
          .toLowerCase()
          .replace(/[^a-z0-9]/gi, "")
          .slice(0, 8) || "bin";
      const id = crypto.randomUUID();
      const path = `${user.id}/${id}.${ext}`;

      // Stream the Blob directly — DO NOT buffer with arrayBuffer() first.
      const { error: upErr } = await supabase.storage
        .from("canvus-files")
        .upload(path, f, {
          contentType: rawMime,
          upsert: false,
        });
      if (upErr) {
        console.error("[share] upload failed", upErr);
        continue;
      }

      const dropType = rawMime.startsWith("image/") ? "IMAGE" : "FILE";
      await supabase.from("canvus_drops").insert({
        user_id: user.id,
        type: dropType,
        file_path: path,
        file_name: f.name,
        file_mime: rawMime,
        file_size: f.size,
        device_name: deviceName,
        tags: [],
      });
    }
  } catch (e) {
    console.error("[share.POST]", e);
  }

  return NextResponse.redirect(new URL("/app", req.url));
}

// Also accept GET for browsers that implement share_target as GET (older
// Android Chrome). The URL params land on the composer via searchParams.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirect = new URL("/app", req.url);
  const title = url.searchParams.get("title");
  const text = url.searchParams.get("text");
  const sharedUrl = url.searchParams.get("url");
  if (title) redirect.searchParams.set("title", title);
  if (text) redirect.searchParams.set("text", text);
  if (sharedUrl) redirect.searchParams.set("url", sharedUrl);
  return NextResponse.redirect(redirect);
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/heic": "heic",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/markdown": "md",
    "text/csv": "csv",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/json": "json",
  };
  return map[mime] ?? "bin";
}
