"use client";

import * as React from "react";
import { DeviceCard } from "@/components/device-card";
import type { Device } from "@/lib/types";

export function DevicesList({ initial }: { initial: Device[] }) {
  const [devices, setDevices] = React.useState<Device[]>(initial);

  const active = devices.filter((d) => !d.revokedAt);
  const revoked = devices.filter((d) => !!d.revokedAt);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              onChange={(next) =>
                setDevices((prev) =>
                  prev.map((x) => (x.id === next.id ? next : x)),
                )
              }
              onRemove={(id) =>
                setDevices((prev) =>
                  prev.map((x) =>
                    x.id === id
                      ? { ...x, revokedAt: new Date().toISOString() }
                      : x,
                  ),
                )
              }
            />
          ))}
        </div>
        {active.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-fg-mute)]">
            No active devices yet. Open Canvus on another device to link it.
          </div>
        )}
      </section>

      {revoked.length > 0 && (
        <section>
          <div className="mono mb-3 px-1 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
            revoked
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {revoked.map((d) => (
              <DeviceCard
                key={d.id}
                device={d}
                onChange={(next) =>
                  setDevices((prev) =>
                    prev.map((x) => (x.id === next.id ? next : x)),
                  )
                }
                onRemove={() => {}}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
