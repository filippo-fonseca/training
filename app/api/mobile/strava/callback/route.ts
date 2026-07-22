// GET /api/mobile/strava/callback
// Strava redirects here after the Expo WebBrowser authorize flow. Verifies the
// signed mobile state, exchanges the code SERVER-SIDE, persists tokens with
// the service-role client (no cookie session in the system browser), then
// deep-links back into the app.

import { NextResponse, type NextRequest } from 'next/server';
import {
  exchangeCode,
  getStravaConfig,
  saveConnection,
  createStravaServiceClient,
} from '@/lib/strava';
import {
  MOBILE_STRAVA_DEEP_LINK,
  parseMobileStravaState,
} from '@/lib/strava/mobile-state';

export const dynamic = 'force-dynamic';

function deepLink(params: string): NextResponse {
  return NextResponse.redirect(`${MOBILE_STRAVA_DEEP_LINK}?${params}`);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const config = getStravaConfig();
  if (!config) return deepLink('error=not_configured');

  const params = req.nextUrl.searchParams;
  if (params.get('error')) return deepLink('error=access_denied');

  const code = params.get('code');
  const state = params.get('state');
  const parsed = parseMobileStravaState(state);
  if (!code || !parsed) return deepLink('error=state_mismatch');

  const service = createStravaServiceClient();
  if (!service) return deepLink('error=not_configured');

  try {
    const token = await exchangeCode(config, code);
    await saveConnection(service, token);
  } catch {
    return deepLink('error=exchange_failed');
  }

  return deepLink('connected=1');
}
