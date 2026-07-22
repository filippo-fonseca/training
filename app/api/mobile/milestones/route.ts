// GET /api/mobile/milestones
import { NextResponse } from 'next/server';
import { loadMilestones } from '@/app/(public)/milestones/_data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadMilestones();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'milestones_failed',
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
