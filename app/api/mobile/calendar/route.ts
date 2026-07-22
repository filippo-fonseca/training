// GET /api/mobile/calendar?month=YYYY-MM
import { NextResponse, type NextRequest } from 'next/server';
import { getCalendarData } from '@/components/calendar/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? undefined;
  try {
    const data = await getCalendarData(month);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'calendar_failed',
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
