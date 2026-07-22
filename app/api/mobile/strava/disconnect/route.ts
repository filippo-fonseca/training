// DELETE /api/mobile/strava/connection — owner Bearer. Unlink Strava.
import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, requireMobileOwner } from '@/lib/auth/mobile';
import { deleteConnection } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const owner = await requireMobileOwner(req);
  if (owner instanceof NextResponse) return owner;
  try {
    await deleteConnection(owner.supabase);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(
      500,
      'unlink_failed',
      err instanceof Error ? err.message : undefined,
    );
  }
}
