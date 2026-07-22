// POST /api/mobile/strava/auto-link — owner Bearer. Force auto-link for today.
import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, requireMobileOwner } from '@/lib/auth/mobile';
import { runAutoLink } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const owner = await requireMobileOwner(req);
  if (owner instanceof NextResponse) return owner;
  try {
    const result = await runAutoLink(owner.supabase, { force: true });
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(
      500,
      'auto_link_failed',
      err instanceof Error ? err.message : undefined,
    );
  }
}
