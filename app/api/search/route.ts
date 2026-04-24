import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fromRow, type DropRow } from "@/lib/types";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    q: sp.get("q") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const q = parsed.data.q?.trim() ?? "";
  if (!q) return NextResponse.json({ drops: [] });

  const { data, error } = await supabase.rpc("canvus_search_drops", {
    p_q: q,
    p_limit: parsed.data.limit,
  });

  if (error) {
    console.error("[search.GET]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const drops = ((data ?? []) as DropRow[]).map(fromRow);
  return NextResponse.json({ drops });
}
