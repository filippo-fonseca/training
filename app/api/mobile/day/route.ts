// GET /api/mobile/day?date=YYYY-MM-DD
import { NextResponse, type NextRequest } from 'next/server';
import { getDayData } from '@/components/calendar/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  try {
    const data = await getDayData(date);
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'day_failed',
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
