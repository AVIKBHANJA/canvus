"use client";

import * as React from "react";

const KEY = "canvus:device_key";

/** Mount once in the app shell. Generates/persists a device_key locally and
 *  registers the current device with the server. Fire-and-forget. */
export function RegisterCurrentDevice() {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let key = localStorage.getItem(KEY);
        if (!key) {
          key = crypto.randomUUID();
          localStorage.setItem(KEY, key);
        }
        if (cancelled) return;
        const name = deviceName();
        await fetch("/api/devices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            device_key: key,
            name,
            ua: navigator.userAgent.slice(0, 512),
          }),
        });
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Android phone" : "Android tablet";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";
  return "This device";
}
