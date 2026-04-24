/**
 * Sanitize search-headline HTML coming from Postgres `ts_headline`.
 * Only `<mark>` tags are preserved; everything else is escaped.
 * Safe to render via `dangerouslySetInnerHTML`.
 */
export function sanitizeHeadline(raw: string): string {
  if (!raw) return "";
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/&lt;(\/?)mark&gt;/g, "<$1mark>");
}
