// GET /api/mobile/strava/status — owner Bearer. Connection + activity counts.
import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, requireMobileOwner } from '@/lib/auth/mobile';
import { getConnection, isStravaConfigured } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const owner = await requireMobileOwner(req);
  if (owner instanceof NextResponse) return owner;

  if (!isStravaConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  try {
    const connection = await getConnection(owner.supabase);
    const { count } = await owner.supabase
      .from('strava_activities')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      configured: true,
      connected: Boolean(connection),
      athleteId: connection?.strava_athlete_id ?? null,
      scope: connection?.scope ?? null,
      updatedAt: connection?.updated_at ?? null,
      activityCount: count ?? 0,
    });
  } catch (err) {
    return jsonError(
      500,
      'status_failed',
      err instanceof Error ? err.message : undefined,
    );
  }
}
