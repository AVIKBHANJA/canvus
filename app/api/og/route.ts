import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchOG } from "@/lib/og";
import { isUrl } from "@/lib/utils";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ *
 * Per-user token bucket rate limiter — 30 req / 60s / user.
 * In-memory map; OK for a single-instance deploy. For multi-instance
 * deployments swap for Upstash or equivalent.
 * ------------------------------------------------------------------ */

type Bucket = { tokens: number; updatedAt: number };
const RATE_CAPACITY = 30;
const RATE_WINDOW_MS = 60_000;
const REFILL_PER_MS = RATE_CAPACITY / RATE_WINDOW_MS;
const buckets = new Map<string, Bucket>();

function take(userId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(userId) ?? { tokens: RATE_CAPACITY, updatedAt: now };
  const elapsed = now - b.updatedAt;
  const refilled = Math.min(RATE_CAPACITY, b.tokens + elapsed * REFILL_PER_MS);
  if (refilled < 1) {
    const needed = 1 - refilled;
    const retryAfter = Math.ceil(needed / REFILL_PER_MS / 1000);
    buckets.set(userId, { tokens: refilled, updatedAt: now });
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  buckets.set(userId, { tokens: refilled - 1, updatedAt: now });
  return { ok: true };
}

export async function GET(req: Request) {
  // OG fetcher is auth-gated to prevent anonymous scraping through our server.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rate = take(user.id);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "retry-after": String(rate.retryAfter) },
      },
    );
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url || !isUrl(url))
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });

  const og = await fetchOG(url);
  return NextResponse.json({ og });
}
