import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDayData } from '@/components/calendar/data';
import { SessionDetail } from '@/components/calendar/session-detail';
import { Alternatives } from '@/components/calendar/alternatives';
import { MilestoneBadges } from '@/components/calendar/milestone-badges';
import { LoggedVsPlan } from '@/components/calendar/logged-vs-plan';
import { SessionEvidence } from '@/components/calendar/session-evidence';
import { STATUS_META } from '@/components/calendar/status';
import {
  isISODate,
  longDateLabel,
  monthKey,
  shortDateLabel,
} from '@/components/calendar/date-utils';
import { staggerStyle } from '@/lib/design/motion';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  if (!isISODate(date)) return { title: 'Day · Training plan' };
  return {
    title: `${shortDateLabel(date)} · Training plan`,
    description: `Full session prescription for ${longDateLabel(date)}.`,
  };
}

export default async function DayPage({ params }: PageProps) {
  const { date } = await params;
  if (!isISODate(date)) notFound();

  const data = await getDayData(date);

  // undefined = environment not configured; null = valid date not in the plan.
  if (data === undefined) {
    return (
      <DayFrame backHref="/calendar">
        <div className="rounded-sd-card border border-sd-line bg-sd-box/40 px-6 py-16 text-center">
          <h1 className="text-lg font-semibold text-sd-ink">Day unavailable</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-sd-ink-dull">
            The plan could not be loaded. The database may not be configured in this environment yet.
          </p>
        </div>
      </DayFrame>
    );
  }
  if (data === null) notFound();

  const { day, week, primary, secondary, alternatives, milestones, log, evidence, offPlan, status } = data;
  const statusMeta = STATUS_META[status];
  const backHref = `/calendar?month=${monthKey(date)}`;

  return (
    <DayFrame backHref={backHref}>
      {/* Header */}
      <header className="sd-enter flex flex-col gap-3" style={staggerStyle(0)}>
        <div className="flex items-center justify-between gap-3">
          <span className="sd-stat-label">
            {day.weekday ?? ''} · Day {day.day_index}/98
          </span>
          <div className="flex items-center gap-1.5">
            <DayArrow href={data.prevDate ? `/day/${data.prevDate}` : null} dir="prev" />
            <DayArrow href={data.nextDate ? `/day/${data.nextDate}` : null} dir="next" />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-sd-ink">{longDateLabel(date)}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sd-line bg-sd-box px-2.5 py-1">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: statusMeta.hueVar ? `var(${statusMeta.hueVar})` : 'var(--sd-ink-faint)' }}
            />
            <span className="text-tiny text-sd-ink-dull">{statusMeta.label}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sd-ink-faint">
          {week?.phase_label ? (
            <span>
              <span className="text-sd-ink-dull">Week {week.week_index}</span> · {week.phase_label}
            </span>
          ) : day.phase_label ? (
            <span>{day.phase_label}</span>
          ) : null}
          {day.days_to_race != null ? (
            <span className="sd-numeral">
              {day.days_to_race === 0 ? 'Race day' : `${day.days_to_race} days to race`}
            </span>
          ) : null}
          {day.cumulative_km != null ? (
            <span className="sd-numeral">{Math.round(day.cumulative_km)} km cumulative</span>
          ) : null}
        </div>
      </header>

      {/* Milestones */}
      {milestones.length > 0 ? (
        <div className="sd-enter" style={staggerStyle(1)}>
          <MilestoneBadges milestones={milestones} />
        </div>
      ) : null}

      {/* Primary session */}
      <div className="sd-enter" style={staggerStyle(2)}>
        {primary ? (
          <SessionDetail
            session={primary}
            slot="primary"
            alternatives={alternatives.length > 0 ? <Alternatives alternatives={alternatives} /> : undefined}
          />
        ) : (
          <p className="rounded-sd-card border border-sd-line bg-sd-box/40 px-5 py-8 text-center text-sm text-sd-ink-faint">
            Nothing planned for this day.
          </p>
        )}
      </div>

      {/* Secondary session */}
      {secondary ? (
        <div className="sd-enter" style={staggerStyle(3)}>
          <SessionDetail session={secondary} slot="secondary" />
        </div>
      ) : null}

      {/* Actual result: linked Strava evidence wins, manual log is the fallback.
          An off-plan run has no planned session to compare, so it skips this
          logged-vs-plan block and renders only the OFF-PLAN RUN evidence below. */}
      {log || (evidence.length > 0 && !offPlan) ? (
        <div className="sd-enter" style={staggerStyle(4)}>
          <LoggedVsPlan log={log} primary={primary} plannedKm={day.planned_run_km} evidence={offPlan ? [] : evidence} />
        </div>
      ) : null}

      {/* Strava verification badge(s): photo, title, outbound link. An off-plan
          day-level run is labelled "OFF-PLAN RUN" but still reads as verified. */}
      {evidence.length > 0 ? (
        <div className="sd-enter" style={staggerStyle(5)}>
          <SessionEvidence evidence={evidence} offPlan={offPlan} />
        </div>
      ) : null}
    </DayFrame>
  );
}

function DayFrame({ backHref, children }: { backHref: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href={backHref}
        className="w-fit text-xs text-sd-ink-faint transition-colors duration-150 hover:text-sd-ink-dull"
      >
        ← Calendar
      </Link>
      {children}
    </main>
  );
}

function DayArrow({ href, dir }: { href: string | null; dir: 'prev' | 'next' }) {
  const glyph = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
  const base = 'grid size-7 place-items-center rounded-full border border-sd-line bg-sd-box';
  if (!href) {
    return <span aria-disabled className={`${base} cursor-not-allowed text-sd-ink-faint/40`}>{glyph}</span>;
  }
  return (
    <Link href={href} aria-label={dir === 'prev' ? 'Previous day' : 'Next day'} className={`${base} sd-press text-sd-ink-dull hover:border-sd-selected hover:bg-sd-hover hover:text-sd-ink`}>
      {glyph}
    </Link>
  );
}
