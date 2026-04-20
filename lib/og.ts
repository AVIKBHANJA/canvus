import { promises as dns } from "node:dns";
import { parse } from "node-html-parser";

export type OG = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string | null;
};

const MAX_HTML_BYTES = 1 * 1024 * 1024; // 1 MB cap
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/* ------------------------------------------------------------------ *
 * LRU cache — normalized URL → OG result, 24h TTL, cap 500 entries.
 * ------------------------------------------------------------------ */

type CacheEntry = { value: OG; expires: number };
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): OG | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  // Re-insert to move to most-recent position.
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function cacheSet(key: string, value: OG): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/* ------------------------------------------------------------------ *
 * SSRF guards
 * ------------------------------------------------------------------ */

/** Returns true if the IPv4 string lives in a private / loopback / link-local range. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 0) return true; // 0.0.0.0/8
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Returns true if the IPv6 string is loopback / unique-local / link-local / IPv4-mapped private. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  // fc00::/7 unique-local (fc.. or fd..)
  if (/^fc|^fd/.test(lower)) return true;
  // fe80::/10 link-local
  if (/^fe[89ab]/.test(lower)) return true;
  // IPv4-mapped: ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:([\d.]+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  // ::ffff:0:0/96 covered above; also ::a.b.c.d (deprecated) — treat as IPv4-mapped
  const compat = lower.match(/^::([\d.]+)$/);
  if (compat) return isPrivateIPv4(compat[1]);
  return false;
}

/**
 * Validate scheme, port, and resolved IPs for a URL.
 * Throws on disallowed. Resolves ALL DNS records (A + AAAA).
 */
async function assertSafeUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("bad_url");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("bad_scheme");
  }

  // Port allow-list: 80 / 443 (empty means default, which is 80 or 443).
  const port = parsed.port;
  if (port !== "" && port !== "80" && port !== "443") {
    throw new Error("bad_port");
  }

  // DNS resolution guard. `lookup` with `all: true` returns every A+AAAA result.
  const host = parsed.hostname;
  // Reject IP literals in private ranges directly.
  if (/^[\d.]+$/.test(host)) {
    if (isPrivateIPv4(host)) throw new Error("private_ip");
  } else if (host.includes(":")) {
    if (isPrivateIPv6(host)) throw new Error("private_ip");
  } else {
    let records: { address: string; family: number }[] = [];
    try {
      records = await dns.lookup(host, { all: true });
    } catch {
      throw new Error("dns_fail");
    }
    if (records.length === 0) throw new Error("dns_empty");
    for (const r of records) {
      if (r.family === 4 && isPrivateIPv4(r.address)) {
        throw new Error("private_ip");
      }
      if (r.family === 6 && isPrivateIPv6(r.address)) {
        throw new Error("private_ip");
      }
    }
  }

  return parsed;
}

/**
 * Fetch with manual redirect handling — each hop is re-validated through
 * `assertSafeUrl`. Max 3 redirects. Returns the final Response (which may
 * be 3xx if MAX_REDIRECTS is exceeded — caller treats that as failure).
 */
async function safeFetch(
  initialUrl: string,
  signal: AbortSignal,
): Promise<Response | null> {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const validated = await assertSafeUrl(current);
    const res = await fetch(validated.toString(), {
      signal,
      redirect: "manual",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; CanvusBot/1.0; +https://canvus.local)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const status = res.status;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try {
        // Resolve relative redirects against the current URL.
        current = new URL(loc, validated).toString();
      } catch {
        return null;
      }
      continue;
    }
    return res;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Public fetch function
 * ------------------------------------------------------------------ */

const emptyOG: OG = {
  title: null,
  description: null,
  image: null,
  siteName: null,
  url: null,
};

/**
 * Fetch Open Graph / meta tags for a URL.
 * - Blocks non-http(s) schemes, non-80/443 ports, and private-IP hosts.
 * - Manually follows up to 3 redirects, re-validating each hop.
 * - Hard 5s timeout; response capped at ~1 MB.
 * - Caches by URL with a 24h TTL (LRU, max 500 entries).
 * Returns nulls on failure — never throws.
 */
export async function fetchOG(url: string): Promise<OG> {
  // Normalize for cache key (strip fragment).
  let cacheKey: string;
  try {
    const u = new URL(url);
    u.hash = "";
    cacheKey = u.toString();
  } catch {
    return emptyOG;
  }

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);

  try {
    const res = await safeFetch(cacheKey, ctl.signal);
    if (!res || !res.ok || !res.body) {
      cacheSet(cacheKey, emptyOG);
      return emptyOG;
    }

    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("html") && !ctype.includes("xml")) {
      cacheSet(cacheKey, emptyOG);
      return emptyOG;
    }

    // Read up to MAX_HTML_BYTES, then abort the stream.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
        if (total >= MAX_HTML_BYTES) {
          try {
            await reader.cancel();
          } catch {
            /* noop */
          }
          break;
        }
      }
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.byteLength;
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const parsed = extractOG(html, cacheKey);
    cacheSet(cacheKey, parsed);
    return parsed;
  } catch {
    cacheSet(cacheKey, emptyOG);
    return emptyOG;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * HTML parsing — node-html-parser, not regex.
 * ------------------------------------------------------------------ */

function extractOG(html: string, baseUrl: string): OG {
  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: {
      script: false,
      style: false,
      noscript: false,
      pre: true,
    },
  });

  const metaContent = (names: string[]): string | null => {
    for (const n of names) {
      // Match property= and name=, quoted either way.
      const el =
        root.querySelector(`meta[property="${n}"]`) ??
        root.querySelector(`meta[name="${n}"]`);
      const c = el?.getAttribute("content");
      if (c && c.trim()) return c.trim();
    }
    return null;
  };

  const titleTag = root.querySelector("title")?.text?.trim() ?? null;

  const title =
    metaContent(["og:title", "twitter:title"]) ?? (titleTag || null);
  const description = metaContent([
    "og:description",
    "twitter:description",
    "description",
  ]);
  let image = metaContent([
    "og:image",
    "og:image:url",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
  ]);
  const siteName = metaContent(["og:site_name", "application-name"]);
  let ogUrl = metaContent(["og:url", "twitter:url"]);

  // Resolve relative URLs against the page URL.
  const resolve = (u: string | null): string | null => {
    if (!u) return null;
    try {
      const absolute = new URL(u, baseUrl).toString();
      if (!/^https?:\/\//i.test(absolute)) return null;
      return absolute;
    } catch {
      return null;
    }
  };

  image = resolve(image);
  ogUrl = resolve(ogUrl);

  return {
    title,
    description,
    image,
    siteName,
    url: ogUrl,
  };
}
