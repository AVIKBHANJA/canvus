import "server-only";
import { UAParser } from "ua-parser-js";

/**
 * Labels the originating device from the request's User-Agent header.
 * Server-only: `ua-parser-js` is a ~50KB dep we don't want shipped to the
 * browser. The `server-only` import makes bundling from a client component
 * fail loudly at build time.
 */
export function deviceLabelFromUA(ua: string | null | undefined): string {
  if (!ua) return "Unknown";
  const p = new UAParser(ua).getResult();
  const os = p.os?.name;
  const browser = p.browser?.name;
  const device = p.device?.model;
  const type = p.device?.type; // mobile, tablet, etc.

  if (device && (type === "mobile" || type === "tablet")) {
    // iPhone, iPad, Pixel 7, etc.
    return device;
  }
  if (os === "iOS") return "iPhone";
  if (os === "Android") return "Android";
  if (os && browser) return `${os} ${browser}`;
  if (os) return os;
  return browser ?? "Unknown";
}
