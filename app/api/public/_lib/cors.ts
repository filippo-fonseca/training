/**
 * CORS policy for the public widget API (D8). Scoped to hyperpolymath.com,
 * its www variant, and localhost dev origins; every other origin gets a
 * response with no Access-Control-Allow-Origin header, which browsers treat
 * as a same-origin-only response.
 */

const ALLOWED_ORIGINS = new Set([
  "https://hyperpolymath.com",
  "https://www.hyperpolymath.com",
]);

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin) || LOCALHOST_ORIGIN.test(origin);
}

/**
 * Reflects the request's Origin only when allowlisted.
 *
 * Deliberately does NOT set `Vary: Origin`: Next.js's App Router
 * unconditionally overwrites the `Vary` header on every route-handler
 * response (`setVaryHeader` in `next/dist/server/base-server.js`) with its
 * own RSC-routing value, so a caller-set Vary header here is silently
 * discarded (verified against both `next dev` and a `next build && next
 * start`). Because the CDN cache key therefore does not partition by Origin,
 * a cached response could theoretically be served across the allowlisted
 * origins for up to `s-maxage` seconds; kept narrow (60s) and low-risk since
 * only the two production hyperpolymath.com origins and local dev are ever
 * allowlisted. See docs/API.md.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin as string;
  }
  return headers;
}
