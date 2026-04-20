import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { fromRow, type DropRow } from "@/lib/types";

export const runtime = "nodejs";

const patchSchema = z.object({
  pinned: z.boolean().optional(),
  tags: z
    .array(z.string().trim().regex(/^[\w\- ]{1,32}$/))
    .max(12)
    .optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  // RLS ensures the row is owned by `user`; .eq user_id is defense in depth.
  const { data, error } = await supabase
    .from("canvus_drops")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ drop: fromRow(data as DropRow) });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  return doDelete(id);
}

/**
 * POST handler — accepts `{ _commitDelete: true }` from `navigator.sendBeacon`
 * as a last-ditch commit when the tab becomes hidden during an undo window.
 * sendBeacon can only issue POSTs, not DELETEs — this is the workaround.
 *
 * The cookie-based Supabase session authenticates the request; we still
 * enforce an Origin check so cross-site beacons are blocked (beacons do
 * include Origin, so this is safe).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;

  const { id } = await ctx.params;

  let body: unknown = null;
  try {
    // sendBeacon ships JSON as Blob — parse defensively.
    const txt = await req.text();
    if (txt) body = JSON.parse(txt);
  } catch {
    /* swallow */
  }

  if (
    body &&
    typeof body === "object" &&
    (body as { _commitDelete?: unknown })._commitDelete === true
  ) {
    return doDelete(id);
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

async function doDelete(id: string): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch first so we can remove the storage object afterwards.
  const { data: existing } = await supabase
    .from("canvus_drops")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error: delErr } = await supabase
    .from("canvus_drops")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (delErr) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing?.file_path) {
    const { error: rmErr } = await supabase.storage
      .from("canvus-files")
      .remove([existing.file_path]);
    if (rmErr) {
      // Row deleted; log but don't fail the request.
      console.warn("[drops.DELETE] storage remove failed", rmErr);
    }
  }

  return NextResponse.json({ ok: true });
}
