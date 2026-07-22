// GET /api/mobile/stats
import { NextResponse } from 'next/server';
import { loadStats } from '@/app/(public)/stats/_data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadStats();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'stats_failed',
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
