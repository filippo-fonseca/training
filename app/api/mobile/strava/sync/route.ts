// POST /api/mobile/strava/sync — owner Bearer. Runs the shared sync engine.
import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, requireMobileOwner } from '@/lib/auth/mobile';
import { runStravaSync } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const owner = await requireMobileOwner(req);
  if (owner instanceof NextResponse) return owner;
  try {
    const result = await runStravaSync(owner.supabase);
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(500, 'sync_failed', err instanceof Error ? err.message : undefined);
  }
}
