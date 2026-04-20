import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deviceLabelFromUA } from "@/lib/device";
import { fetchOG } from "@/lib/og";
import { isUrl } from "@/lib/utils";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { fromRow, type DropRow } from "@/lib/types";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ *
 * Validation primitives
 * ------------------------------------------------------------------ */

const ALLOWED_MIMES = [
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
] as const;

const tagSchema = z
  .array(z.string().trim().regex(/^[\w\- ]{1,32}$/))
  .max(12);

const textLinkSchema = z
  .object({
    type: z.enum(["TEXT", "LINK"]),
    content: z.string().trim().min(1).max(50_000).optional(),
    url: z.string().url().optional(),
    tags: tagSchema.optional(),
  })
  .refine(
    (d) =>
      (d.type === "TEXT" && !!d.content) ||
      (d.type === "LINK" && !!d.url && isUrl(d.url)),
    { message: "TEXT requires content, LINK requires a valid url" },
  );

function fileDropSchema(userId: string, supabaseHost: string) {
  return z.object({
    type: z.enum(["IMAGE", "FILE"]),
    file_path: z
      .string()
      .min(1)
      .max(512)
      .refine(
        (p) => p.startsWith(`${userId}/`) && !p.includes(".."),
        { message: "file_path must belong to the authenticated user" },
      ),
    file_name: z.string().trim().min(1).max(512),
    file_mime: z.enum(ALLOWED_MIMES),
    file_size: z
      .number()
      .int()
      .nonnegative()
      .max(50 * 1024 * 1024),
    thumbnail: z
      .string()
      .url()
      .refine((u) => u.startsWith(`https://${supabaseHost}/`), {
        message: "thumbnail must be on the Supabase URL",
      })
      .nullable()
      .optional(),
    tags: tagSchema.optional(),
  });
}

/* ------------------------------------------------------------------ *
 * POST — create a drop (TEXT / LINK with OG enrichment, or IMAGE / FILE
 * after the browser has already uploaded to Storage).
 * ------------------------------------------------------------------ */

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceName = deviceLabelFromUA(req.headers.get("user-agent"));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Route to the correct validator by `type`.
  const typeField = (body as { type?: unknown } | null)?.type;

  try {
    if (typeField === "TEXT" || typeField === "LINK") {
      const parsed = textLinkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: parsed.error.format() },
          { status: 400 },
        );
      }
      return await createTextOrLink(supabase, user.id, deviceName, parsed.data);
    }

    if (typeField === "IMAGE" || typeField === "FILE") {
      const supabaseHost = new URL(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
      ).host;
      const parsed = fileDropSchema(user.id, supabaseHost).safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: parsed.error.format() },
          { status: 400 },
        );
      }
      const d = parsed.data;
      const { data: row, error } = await supabase
        .from("canvus_drops")
        .insert({
          user_id: user.id,
          type: d.type,
          file_path: d.file_path,
          file_name: d.file_name,
          file_mime: d.file_mime,
          file_size: d.file_size,
          thumbnail: d.thumbnail ?? null,
          tags: d.tags ?? [],
          device_name: deviceName,
        })
        .select("*")
        .single();
      if (error || !row) {
        // Clean up orphaned upload if insert failed.
        await supabase.storage
          .from("canvus-files")
          .remove([d.file_path])
          .catch(() => {});
        throw error ?? new Error("Insert failed");
      }
      return NextResponse.json(
        { drop: fromRow(row as DropRow) },
        { status: 201 },
      );
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[drops.POST]", err);
    return NextResponse.json(
      { error: "Failed to create drop" },
      { status: 500 },
    );
  }
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

async function createTextOrLink(
  supabase: SupabaseLike,
  userId: string,
  deviceName: string,
  data: z.infer<typeof textLinkSchema>,
) {
  const tags = data.tags ?? [];

  if (data.type === "TEXT") {
    const content = data.content!.trim();
    // If the user pasted a bare URL into the text tab, promote to LINK.
    if (isUrl(content)) {
      const og = await fetchOG(content);
      const { data: row, error } = await supabase
        .from("canvus_drops")
        .insert({
          user_id: userId,
          type: "LINK",
          url: content,
          content,
          og_title: og.title,
          og_desc: og.description,
          og_image: og.image,
          tags,
          device_name: deviceName,
        })
        .select("*")
        .single();
      if (error || !row) throw error ?? new Error("Insert failed");
      return NextResponse.json(
        { drop: fromRow(row as DropRow) },
        { status: 201 },
      );
    }

    const { data: row, error } = await supabase
      .from("canvus_drops")
      .insert({
        user_id: userId,
        type: "TEXT",
        content,
        tags,
        device_name: deviceName,
      })
      .select("*")
      .single();
    if (error || !row) throw error ?? new Error("Insert failed");
    return NextResponse.json(
      { drop: fromRow(row as DropRow) },
      { status: 201 },
    );
  }

  // LINK
  const url = data.url!;
  const og = await fetchOG(url);
  const { data: row, error } = await supabase
    .from("canvus_drops")
    .insert({
      user_id: userId,
      type: "LINK",
      url,
      content: url,
      og_title: og.title,
      og_desc: og.description,
      og_image: og.image,
      tags,
      device_name: deviceName,
    })
    .select("*")
    .single();
  if (error || !row) throw error ?? new Error("Insert failed");
  return NextResponse.json(
    { drop: fromRow(row as DropRow) },
    { status: 201 },
  );
}

/* ------------------------------------------------------------------ *
 * GET — keyset pagination for the feed's "load older" button.
 * Query: ?before_pinned=0|1&before_created=ISO&before_id=uuid&limit=50
 * ------------------------------------------------------------------ */

const pageSchema = z.object({
  before_pinned: z.enum(["0", "1"]).optional(),
  before_created: z.string().datetime().optional(),
  before_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const parsed = pageSchema.safeParse({
    before_pinned: sp.get("before_pinned") ?? undefined,
    before_created: sp.get("before_created") ?? undefined,
    before_id: sp.get("before_id") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  let q = supabase
    .from("canvus_drops")
    .select("*")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(parsed.data.limit);

  // Keyset: rows strictly "after" (older than) the cursor under the
  // compound order (pinned desc, created_at desc, id desc).
  if (
    parsed.data.before_created &&
    parsed.data.before_id &&
    parsed.data.before_pinned !== undefined
  ) {
    const pinnedVal = parsed.data.before_pinned === "1";
    if (pinnedVal) {
      // Cursor is pinned: either a pinned row older than cursor, or any unpinned row.
      q = q.or(
        `and(pinned.eq.true,created_at.lt.${parsed.data.before_created}),and(pinned.eq.true,created_at.eq.${parsed.data.before_created},id.lt.${parsed.data.before_id}),pinned.eq.false`,
      );
    } else {
      // Cursor is unpinned: only unpinned rows older than cursor.
      q = q
        .eq("pinned", false)
        .or(
          `created_at.lt.${parsed.data.before_created},and(created_at.eq.${parsed.data.before_created},id.lt.${parsed.data.before_id})`,
        );
    }
  }

  const { data, error } = await q;
  if (error) {
    console.error("[drops.GET]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
  const drops = ((data ?? []) as DropRow[]).map(fromRow);
  return NextResponse.json({ drops });
}
