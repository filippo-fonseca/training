import type { Metadata } from 'next';
import Link from 'next/link';
import { getCalendarData } from '@/components/calendar/data';
import { CalendarNav } from '@/components/calendar/calendar-nav';
import { CalendarLegend } from '@/components/calendar/legend';
import { MonthGrid } from '@/components/calendar/month-grid';
import { WeekStrip } from '@/components/calendar/week-strip';
import {
  addMonths,
  isMonthKey,
  monthKey,
  monthLabel,
} from '@/components/calendar/date-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Calendar · Training plan',
  description: 'Month and week views across the full training plan.',
};

interface PageProps {
  searchParams: Promise<{ month?: string; view?: string; week?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getCalendarData();

  if (!data) {
    return (
      <CalendarFrame>
        <EmptyState
          title="Calendar unavailable"
          body="The training plan could not be loaded. The database may not be configured in this environment yet."
        />
      </CalendarFrame>
    );
  }

  const weekCount = data.weeks.length || 14;
  const todayWeek = data.daysByDate.get(data.today)?.day.week_number ?? null;

  // Plan month bounds for navigation clamping.
  const firstMonth = data.planStart ? monthKey(data.planStart) : data.weeks[0]?.start_date ? monthKey(data.weeks[0].start_date) : monthKey(data.today);
  const lastMonth = data.planEnd ? monthKey(data.planEnd) : data.weeks.at(-1)?.end_date ? monthKey(data.weeks.at(-1)!.end_date!) : firstMonth;

  const view: 'month' | 'week' = params.view === 'week' ? 'week' : 'month';

  // Resolve the current month anchor.
  const defaultMonth = data.daysByDate.has(data.today)
    ? monthKey(data.today)
    : data.planStart
      ? monthKey(data.planStart)
      : firstMonth;
  const month = params.month && isMonthKey(params.month) ? params.month : defaultMonth;

  // Resolve the current week anchor.
  const requestedWeek = params.week ? parseInt(params.week, 10) : NaN;
  const defaultWeek = todayWeek ?? 1;
  const weekIndex = Number.isFinite(requestedWeek)
    ? Math.min(Math.max(requestedWeek, 1), weekCount)
    : defaultWeek;

  // Cross-view anchors.
  const weekForMonth = firstPlanWeekInMonth(data, month) ?? todayWeek ?? 1;
  const monthForWeek = data.weeksByIndex.get(weekIndex)?.start_date
    ? monthKey(data.weeksByIndex.get(weekIndex)!.start_date!)
    : month;

  const monthHref = `/calendar?month=${monthForWeekOrSelf(view, month, monthForWeek)}`;
  const weekHref = `/calendar?view=week&week=${view === 'week' ? weekIndex : weekForMonth}`;

  // Prev / next within the active view.
  const prevHref =
    view === 'month'
      ? month > firstMonth
        ? `/calendar?month=${addMonths(month, -1)}`
        : null
      : weekIndex > 1
        ? `/calendar?view=week&week=${weekIndex - 1}`
        : null;
  const nextHref =
    view === 'month'
      ? month < lastMonth
        ? `/calendar?month=${addMonths(month, 1)}`
        : null
      : weekIndex < weekCount
        ? `/calendar?view=week&week=${weekIndex + 1}`
        : null;

  const todayHref =
    view === 'month'
      ? `/calendar?month=${defaultMonth}`
      : `/calendar?view=week&week=${todayWeek ?? 1}`;

  const title = view === 'month' ? monthLabel(month) : `Week ${weekIndex} of ${weekCount}`;
  const subtitle =
    view === 'month'
      ? `${data.plan.title}`
      : data.weeksByIndex.get(weekIndex)?.phase_label ?? data.plan.title;

  return (
    <CalendarFrame>
      <CalendarNav
        title={title}
        subtitle={subtitle}
        view={view}
        monthHref={monthHref}
        weekHref={weekHref}
        prevHref={prevHref}
        nextHref={nextHref}
        todayHref={todayHref}
      />
      <CalendarLegend />
      {view === 'month' ? (
        <MonthGrid data={data} month={month} />
      ) : (
        <WeekStrip data={data} weekIndex={weekIndex} />
      )}
    </CalendarFrame>
  );
}

/** The month to show when the Month toggle is clicked from the active view. */
function monthForWeekOrSelf(view: 'month' | 'week', month: string, monthForWeek: string): string {
  return view === 'week' ? monthForWeek : month;
}

/** Lowest plan week_number among the plan days falling inside `month`. */
function firstPlanWeekInMonth(
  data: Awaited<ReturnType<typeof getCalendarData>>,
  month: string,
): number | null {
  if (!data) return null;
  let best: number | null = null;
  for (const cell of data.daysByDate.values()) {
    if (monthKey(cell.day.date) !== month) continue;
    const wn = cell.day.week_number;
    if (wn != null && (best == null || wn < best)) best = wn;
  }
  return best;
}

function CalendarFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="w-fit text-xs text-sd-ink-faint transition-colors duration-150 hover:text-sd-ink-dull"
      >
        ← Overview
      </Link>
      {children}
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sd-card border border-sd-line bg-sd-box/40 px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-sd-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-sd-ink-dull">{body}</p>
    </div>
  );
}
