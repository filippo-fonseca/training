// GET /api/mobile/strava/authorize
// Owner Bearer JWT required. Returns { authorizeUrl } for expo-web-browser.
// State is HMAC-signed with the user id (no cookies).

import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, requireMobileOwner } from '@/lib/auth/mobile';
import { buildAuthorizeUrl, getStravaConfig } from '@/lib/strava';
import {
  createMobileStravaState,
  resolveMobileStravaRedirectUri,
} from '@/lib/strava/mobile-state';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const owner = await requireMobileOwner(req);
  if (owner instanceof NextResponse) return owner;

  const config = getStravaConfig();
  if (!config) return jsonError(503, 'not_configured');

  const forceApproval = req.nextUrl.searchParams.get('relink') === '1';
  const state = createMobileStravaState(owner.user.id);
  const authorizeUrl = buildAuthorizeUrl({
    config,
    redirectUri: resolveMobileStravaRedirectUri(req.url),
    state,
    forceApproval,
  });

  return NextResponse.json({ authorizeUrl, state });
}
