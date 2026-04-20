import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
  ext: z.string().min(1).max(8).regex(/^[a-z0-9]+$/i),
  mime: z.string().min(1).max(120),
});

/**
 * Returns a unique storage path under the user's folder and the rendered
 * full path, so the browser can `supabase.storage.from('canvus-files').upload(...)`.
 * We don't use signed upload URLs because the anon key + RLS storage policies
 * already restrict to `<user_id>/...` writes.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const id = crypto.randomUUID();
  const path = `${user.id}/${id}.${parsed.data.ext}`;
  return NextResponse.json({ path, bucket: "canvus-files" });
}
