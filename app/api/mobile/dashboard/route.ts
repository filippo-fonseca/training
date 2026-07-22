// GET /api/mobile/dashboard — public assembled dashboard payload for Expo.
import { NextResponse } from 'next/server';
import { assembleDashboard } from '@/components/dashboard/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, recentVerified } = await assembleDashboard();
    // Strip non-serializable React nodes; `data` is already serializable.
    return NextResponse.json({ data, recentVerified });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'dashboard_failed',
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
