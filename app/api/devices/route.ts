import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { deviceFromRow, type DeviceRow } from "@/lib/types";
import { readDeviceKey, setDeviceKey } from "@/lib/device-key";
import { logWouldExceed } from "@/lib/quota";

export const runtime = "nodejs";

const upsertSchema = z.object({
  device_key: z.string().trim().min(8).max(128),
  name: z.string().trim().min(1).max(64),
  ua: z.string().trim().max(512).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentKey = await readDeviceKey();

  const { data, error } = await supabase
    .from("canvus_devices")
    .select("*")
    .eq("user_id", user.id)
    .order("revoked_at", { ascending: true, nullsFirst: true })
    .order("last_active_at", { ascending: false });

  if (error) {
    console.error("[devices.GET]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const devices = ((data ?? []) as DeviceRow[]).map((r) =>
    deviceFromRow(r, currentKey),
  );
  return NextResponse.json({ devices });
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
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { count } = await supabase
    .from("canvus_devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  logWouldExceed(user.id, "devices", count ?? 0, 1);

  const { data, error } = await supabase
    .from("canvus_devices")
    .upsert(
      {
        user_id: user.id,
        device_key: parsed.data.device_key,
        name: parsed.data.name,
        ua: parsed.data.ua ?? null,
        last_active_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: "user_id,device_key" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[devices.POST]", error);
    return NextResponse.json({ error: "Upsert failed" }, { status: 500 });
  }

  // Mirror the client-generated device_key into an HttpOnly cookie so the
  // server can identify the current device on subsequent requests.
  await setDeviceKey(parsed.data.device_key);

  return NextResponse.json(
    { device: deviceFromRow(data as DeviceRow, parsed.data.device_key) },
    { status: 201 },
  );
}
