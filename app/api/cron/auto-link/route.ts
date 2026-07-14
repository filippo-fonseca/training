// GET /api/cron/auto-link: the scheduled daily auto-linker (see vercel.json).
// Secured by a CRON_SECRET bearer check exactly like /api/cron/strava-sync
// (Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically). It has
// no owner session, so it runs on the service-role client. The core refreshes
// activities, then links today's Run activities to the plan (session-level, or
// day-level / off-plan when nothing running was planned). The internal hour guard
// only proceeds at 22:00 America/Chicago; `?force=1` bypasses it. Every
// "not configured" path returns 200 so a missing secret never looks like a crash.

import { NextResponse, type NextRequest } from 'next/server';
import {
  createStravaServiceClient,
  getCronSecret,
  isStravaConfigured,
  runAutoLink,
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

  const force = req.nextUrl.searchParams.get('force') === '1';

  try {
    const result = await runAutoLink(client, { force });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
