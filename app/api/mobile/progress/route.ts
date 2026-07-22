// GET /api/mobile/progress
import { NextResponse } from 'next/server';
import { loadProgress } from '@/app/(public)/progress/_data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await loadProgress();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'progress_failed',
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
