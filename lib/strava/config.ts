// Strava configuration — SERVER-ONLY. The client secret and every Strava value
// live in non-public env vars and are read here, never in a NEXT_PUBLIC_ var and
// never shipped to the browser. Import this module only from server components,
// route handlers, and server actions.
//
// Required env (documented in docs/strava.md; not writable from this lane's
// sandbox, so it is not added to .env.example here):
//   STRAVA_CLIENT_ID       — the app's numeric client id
//   STRAVA_CLIENT_SECRET   — the app's client secret (secret!)
//   CRON_SECRET            — bearer token Vercel Cron sends to the sync route
//   STRAVA_REDIRECT_URI    — optional; overrides the derived OAuth callback URL
//                            (defaults to <origin>/api/strava/callback)
//   SUPABASE_SERVICE_ROLE_KEY — server-only; used ONLY by the cron sync path
//                            because it has no owner session (see lib/strava/service.ts)

export const STRAVA_SCOPE = 'read,activity:read_all';
export const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
export const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

/** Refresh the access token when it expires within this many seconds. */
export const TOKEN_REFRESH_BUFFER_S = 300;

export interface StravaConfig {
  clientId: string;
  clientSecret: string;
  /** Explicit redirect override, or null to derive from the request origin. */
  redirectUriOverride: string | null;
}

/** OAuth config, or null when the app has no Strava credentials configured. */
export function getStravaConfig(): StravaConfig | null {
  const clientId = process.env.STRAVA_CLIENT_ID?.trim();
  const clientSecret = process.env.STRAVA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const override = process.env.STRAVA_REDIRECT_URI?.trim();
  return {
    clientId,
    clientSecret,
    redirectUriOverride: override ? override : null,
  };
}

/** True when the Strava OAuth credentials are present. */
export function isStravaConfigured(): boolean {
  return getStravaConfig() !== null;
}

/** The cron bearer secret, or null when unset (cron then reports not-configured). */
export function getCronSecret(): string | null {
  const s = process.env.CRON_SECRET?.trim();
  return s ? s : null;
}

/**
 * The OAuth callback URL. Prefers STRAVA_REDIRECT_URI, else derives
 * `<origin>/api/strava/callback` from the incoming request — so it works with a
 * localhost callback in development and the deployed origin in production.
 */
export function resolveRedirectUri(requestUrl: string): string {
  const cfg = getStravaConfig();
  if (cfg?.redirectUriOverride) return cfg.redirectUriOverride;
  const origin = new URL(requestUrl).origin;
  return `${origin}/api/strava/callback`;
}
