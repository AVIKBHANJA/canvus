/**
 * Lightweight CSRF defense for mutating route handlers.
 *
 * We require that either (a) the Origin header matches our Host, or
 * (b) the `Sec-Fetch-Site` header is `same-origin` / `same-site` / `none`
 * (for navigations like PWA share_target POSTs, which browsers mark as
 * `cross-site` if the share came from another app — so we additionally
 * accept `none` for top-level navigation requests).
 *
 * Returns `null` if the request is same-origin and should proceed, or a
 * `Response` with 403 if it should be rejected.
 */
export function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const secFetchSite = request.headers.get("sec-fetch-site");

  // Fast path: Sec-Fetch-Site explicitly says this is first-party.
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return null;
  }

  // `none` = top-level navigation (not a sub-resource). Safe for PWA share targets.
  if (secFetchSite === "none") return null;

  // Fallback: parse Origin and compare hostname to Host header.
  if (origin && host) {
    try {
      const o = new URL(origin);
      if (o.host === host) return null;
    } catch {
      /* fall through to reject */
    }
  }

  return new Response(
    JSON.stringify({ error: "Cross-origin request rejected" }),
    { status: 403, headers: { "content-type": "application/json" } },
  );
}
