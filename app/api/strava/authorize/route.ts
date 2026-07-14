// GET /api/strava/authorize — owner-gated. Starts the Strava authorization-code
// flow: sets a short-lived CSRF state cookie and redirects to Strava. Pass
// ?relink=1 to force the approval screen (re-grant scopes on a re-link).

import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, isOwnerEmail } from '@/lib/auth/owner';
import { buildAuthorizeUrl, getStravaConfig, resolveRedirectUri } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export const STRAVA_STATE_COOKIE = 'strava_oauth_state';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const config = getStravaConfig();
  if (!config) {
    return NextResponse.redirect(new URL('/admin/strava?error=not_configured', req.url));
  }

  const state = randomBytes(16).toString('hex');
  const forceApproval = req.nextUrl.searchParams.get('relink') === '1';
  const authorizeUrl = buildAuthorizeUrl({
    config,
    redirectUri: resolveRedirectUri(req.url),
    state,
    forceApproval,
  });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(STRAVA_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}
