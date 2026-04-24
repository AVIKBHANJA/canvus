"use client";

import * as React from "react";
import {
  Laptop,
  Pencil,
  RotateCcw,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { Device } from "@/lib/types";

function DeviceIcon({ ua }: { ua: string | null }) {
  if (!ua) return <Laptop className="h-6 w-6" />;
  if (/iPhone|Android.*Mobile/i.test(ua))
    return <Smartphone className="h-6 w-6" />;
  if (/iPad|Android/i.test(ua)) return <Tablet className="h-6 w-6" />;
  return <Laptop className="h-6 w-6" />;
}

export function DeviceCard({
  device,
  onChange,
  onRemove,
}: {
  device: Device;
  onChange: (d: Device) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(device.name);
  const [confirming, setConfirming] = React.useState(false);
  const revoked = !!device.revokedAt;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === device.name) {
      setEditing(false);
      setName(device.name);
      return;
    }
    setEditing(false);
    onChange({ ...device, name: trimmed });
    const res = await fetch(`/api/devices/${device.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      toast("Couldn't rename");
      onChange(device);
      setName(device.name);
    }
  }

  async function revoke() {
    setConfirming(false);
    onRemove(device.id);
    const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
    if (!res.ok) toast("Couldn't revoke");
  }

  return (
    <article
      className={cn(
        "card tile relative flex flex-col gap-4 p-5",
        revoked && "opacity-50 grayscale",
        device.isCurrent &&
          "border-[color-mix(in_oklch,var(--color-accent)_40%,var(--color-border))]",
      )}
    >
      <header className="flex items-start gap-3">
        <div
          aria-hidden
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-[var(--color-border-mute)] bg-[var(--color-surface)] text-[var(--color-fg-mute)]",
            device.isCurrent &&
              "bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]",
          )}
        >
          <DeviceIcon ua={device.ua} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setName(device.name);
                  }
                }}
                className="w-full rounded-[8px] border border-[var(--color-accent)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-fg)] outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-medium tracking-tight text-[var(--color-fg)]">
                {device.name}
              </h3>
              {!revoked && (
                <button
                  onClick={() => setEditing(true)}
                  aria-label="Rename"
                  className="press rounded-[6px] p-1 text-[var(--color-fg-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {device.isCurrent && (
                <span className="mono rounded-full border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                  this device
                </span>
              )}
              {revoked && (
                <span className="mono rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
                  revoked
                </span>
              )}
            </div>
          )}
          <div className="mono tnum mt-1 flex items-center gap-2 text-[11.5px] uppercase tracking-[0.12em] text-[var(--color-fg-dim)]">
            <span>
              {revoked
                ? `revoked ${relativeTime(device.revokedAt!)}`
                : `active ${relativeTime(device.lastActiveAt)}`}
            </span>
          </div>
        </div>
      </header>

      {device.ua && (
        <div className="mono truncate rounded-[8px] border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11px] text-[var(--color-fg-dim)]">
          {device.ua}
        </div>
      )}

      {!revoked && !device.isCurrent && (
        <footer className="flex items-center justify-end">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
                revoke this device?
              </span>
              <button
                onClick={revoke}
                className="press mono rounded-full border border-[var(--color-danger)] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)]"
              >
                confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="press rounded-full p-1 text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
                aria-label="Cancel"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="press mono inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-mute)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              <Trash2 className="h-3 w-3" />
              Revoke
            </button>
          )}
        </footer>
      )}

      {revoked && (
        <footer className="flex items-center justify-end">
          <span className="mono inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
            <RotateCcw className="h-3 w-3" />
            re-activate from device
          </span>
        </footer>
      )}
    </article>
  );
}
