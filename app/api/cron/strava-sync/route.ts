// GET /api/cron/strava-sync — the scheduled sync (see vercel.json). Secured by a
// CRON_SECRET bearer check (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
// automatically). Because there is no owner session here, it runs the shared sync
// engine with the service-role client. Every "creds absent" path returns 200 with
// a "not configured" status so a missing secret never looks like a crash.

import { NextResponse, type NextRequest } from 'next/server';
import {
  createStravaServiceClient,
  getCronSecret,
  isStravaConfigured,
  runStravaSync,
} from '@/lib/strava';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return NextResponse.json({ status: 'not configured', reason: 'CRON_SECRET unset' });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isStravaConfigured()) {
    return NextResponse.json({ status: 'not configured', reason: 'Strava credentials absent' });
  }

  const client = createStravaServiceClient();
  if (!client) {
    return NextResponse.json({
      status: 'not configured',
      reason: 'SUPABASE_SERVICE_ROLE_KEY absent (cron cannot bypass RLS)',
    });
  }

  try {
    const result = await runStravaSync(client);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
