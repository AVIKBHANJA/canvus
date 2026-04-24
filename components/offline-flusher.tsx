"use client";

import * as React from "react";
import { CloudOff, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import {
  countPending,
  flushAll,
  onPendingChange,
} from "@/lib/offline-queue";

/**
 * Visible pill + background flusher for the offline queue.
 * Mounts once in the app shell. Runs on:
 *  - initial load (attempts flush if online)
 *  - `online` window event
 *  - BroadcastChannel "canvus-offline" messages from other tabs
 *  - in-tab change notifications from lib/offline-queue
 */
export function OfflineFlusher() {
  const [count, setCount] = React.useState(0);
  const [flushing, setFlushing] = React.useState(false);
  const [online, setOnline] = React.useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const refreshCount = React.useCallback(async () => {
    try {
      setCount(await countPending());
    } catch {
      /* no-op */
    }
  }, []);

  const flush = React.useCallback(async () => {
    if (flushing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setFlushing(true);
    try {
      const ok = await flushAll();
      if (ok > 0) toast(`Synced ${ok} pending drop${ok === 1 ? "" : "s"}`);
    } finally {
      setFlushing(false);
      refreshCount();
    }
  }, [flushing, refreshCount]);

  React.useEffect(() => {
    refreshCount();
    flush();

    const on = () => {
      setOnline(true);
      flush();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const unsub = onPendingChange(() => refreshCount());

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("canvus-offline");
      bc.onmessage = () => refreshCount();
    } catch {
      /* no-op */
    }

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      unsub();
      bc?.close();
    };
  }, [flush, refreshCount]);

  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 sm:bottom-8 sm:left-8 sm:translate-x-0">
      <button
        type="button"
        onClick={flush}
        disabled={!online || flushing}
        className={cn(
          "glass pointer-events-auto mono inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] shadow-[0_12px_40px_-18px_rgba(0,0,0,0.5)]",
          online
            ? "border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)]"
            : "border-[var(--color-border)] text-[var(--color-fg-mute)]",
        )}
      >
        {online ? (
          <Upload className="h-3.5 w-3.5" />
        ) : (
          <CloudOff className="h-3.5 w-3.5" />
        )}
        <span>
          {flushing
            ? "syncing…"
            : online
              ? `sync ${count} pending`
              : `${count} queued · offline`}
        </span>
      </button>
    </div>
  );
}
