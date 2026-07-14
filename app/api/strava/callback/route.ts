// GET /api/strava/callback — owner-gated OAuth callback. Validates the CSRF
// state cookie, exchanges the code for tokens SERVER-SIDE, and stores the
// connection with the owner cookie client (so RLS is_owner() still applies).
// All error paths redirect back to /admin/strava with a readable ?error code.

import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, isOwnerEmail } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { exchangeCode, getStravaConfig, saveConnection } from '@/lib/strava';
import { STRAVA_STATE_COOKIE } from '../authorize/route';

export const dynamic = 'force-dynamic';

function back(req: NextRequest, params: string): NextResponse {
  return NextResponse.redirect(new URL(`/admin/strava?${params}`, req.url));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const config = getStravaConfig();
  if (!config) return back(req, 'error=not_configured');

  const params = req.nextUrl.searchParams;
  if (params.get('error')) return back(req, 'error=access_denied');

  const code = params.get('code');
  const state = params.get('state');
  const cookieState = req.cookies.get(STRAVA_STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return back(req, 'error=state_mismatch');
  }

  try {
    const token = await exchangeCode(config, code);
    const supabase = await createServerSupabaseClient();
    await saveConnection(supabase, token);
  } catch {
    return back(req, 'error=exchange_failed');
  }

  const res = back(req, 'connected=1');
  res.cookies.delete(STRAVA_STATE_COOKIE);
  return res;
}
