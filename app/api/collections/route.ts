import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/security/same-origin";
import {
  collectionFromRow,
  COLLECTION_COLORS,
  type CollectionRow,
} from "@/lib/types";
import { logWouldExceed } from "@/lib/quota";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(48),
  color: z.enum(COLLECTION_COLORS as [string, ...string[]]).optional(),
  icon: z.string().trim().max(32).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("canvus_collections")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[collections.GET]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const collections = ((data ?? []) as CollectionRow[]).map(collectionFromRow);
  return NextResponse.json({ collections });
}

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;

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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { count } = await supabase
    .from("canvus_collections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  logWouldExceed(user.id, "collections", count ?? 0, 1);

  const { data, error } = await supabase
    .from("canvus_collections")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? "chartreuse",
      icon: parsed.data.icon ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[collections.POST]", error);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }
  return NextResponse.json(
    { collection: collectionFromRow(data as CollectionRow) },
    { status: 201 },
  );
}
