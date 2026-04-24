import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Plan = "free" | "pro";
export type Resource =
  | "collections"
  | "devices"
  | "storage_bytes"
  | "drops_total";

export const SOFT_LIMITS: Record<Resource, number> = {
  collections: 3,
  devices: 3,
  storage_bytes: 1 * 1024 * 1024 * 1024,
  drops_total: 1000,
};

export async function getPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<Plan> {
  const { data } = await supabase
    .from("canvus_profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  return (data?.plan as Plan | undefined) ?? "free";
}

/** Non-blocking telemetry. Logs when current+attempted > free-tier cap. */
export function logWouldExceed(
  userId: string,
  resource: Resource,
  current: number,
  attempted: number,
): void {
  const cap = SOFT_LIMITS[resource];
  if (current + attempted <= cap) return;
  console.warn(
    JSON.stringify({
      tag: "canvus.quota.would_exceed",
      user_id: userId,
      resource,
      current,
      attempted,
      cap,
      ts: new Date().toISOString(),
    }),
  );
}
