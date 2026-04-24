import { createClient } from "@/lib/supabase/server";
import { readDeviceKey } from "@/lib/device-key";
import { deviceFromRow, type DeviceRow } from "@/lib/types";
import { DevicesList } from "./devices-list";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const currentKey = await readDeviceKey();

  const { data } = await supabase
    .from("canvus_devices")
    .select("*")
    .eq("user_id", user.id)
    .order("revoked_at", { ascending: true, nullsFirst: true })
    .order("last_active_at", { ascending: false });

  const devices = ((data ?? []) as DeviceRow[]).map((r) =>
    deviceFromRow(r, currentKey),
  );

  return (
    <div>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight text-[var(--color-fg)] sm:text-4xl">
            Devices
          </h1>
          <p className="mono mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
            your connected canvuses · 2026 looks like this
          </p>
        </div>
        <span className="mono tnum rounded-full border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
          {devices.filter((d) => !d.revokedAt).length} active
        </span>
      </header>
      <DevicesList initial={devices} />
    </div>
  );
}
