// Signed OAuth state for the Expo Strava flow. Cookies do not survive the
// Strava redirect into a system browser, so the mobile authorize route embeds
// the owner user id in an HMAC-signed state blob that the callback verifies.

import { createHmac, timingSafeEqual } from 'node:crypto';

const PREFIX = 'm';
const TTL_MS = 10 * 60 * 1000;

function signingSecret(): string | null {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.STRAVA_CLIENT_SECRET?.trim() ||
    null
  );
}

function sign(payload: string): string {
  const secret = signingSecret();
  if (!secret) throw new Error('No signing secret for mobile Strava state');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createMobileStravaState(userId: string): string {
  const body = Buffer.from(
    JSON.stringify({ u: userId, e: Date.now() + TTL_MS }),
    'utf8',
  ).toString('base64url');
  return `${PREFIX}.${body}.${sign(body)}`;
}

export function parseMobileStravaState(
  state: string | null,
): { userId: string } | null {
  if (!state || !signingSecret()) return null;
  const parts = state.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, body, sig] = parts;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      u?: string;
      e?: number;
    };
    if (!parsed.u || typeof parsed.e !== 'number' || Date.now() > parsed.e) {
      return null;
    }
    return { userId: parsed.u };
  } catch {
    return null;
  }
}

export function isMobileStravaState(state: string | null | undefined): boolean {
  return Boolean(state && state.startsWith(`${PREFIX}.`));
}

/** Deep link back into the Expo app after Strava OAuth. */
export const MOBILE_STRAVA_DEEP_LINK = 'comeback://strava';

export function resolveMobileStravaRedirectUri(requestUrl: string): string {
  const override = process.env.STRAVA_REDIRECT_URI?.trim();
  // Prefer an explicit override only when it already points at the mobile
  // callback; otherwise derive from the request origin so web + mobile can
  // share one Strava app with different callback paths.
  if (override && override.includes('/api/mobile/strava/callback')) return override;
  const origin = new URL(requestUrl).origin;
  return `${origin}/api/mobile/strava/callback`;
}
