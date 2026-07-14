import Link from 'next/link';
import { cn } from '@/lib/design/cn';
import { TrophyGlyph } from '@/components/ui/icons';
import type { CalendarDay } from './data';
import { categoryMeta, STATUS_META, accentChip } from './status';
import { kmValue } from './format';
import { dayOfMonth, type ISODate } from './date-utils';

interface DayCellProps {
  /** The plan day for this date, or null when the date is outside the plan. */
  cell: CalendarDay | null;
  date: ISODate;
  /** False for adjacent-month padding days (rendered dimmed). */
  inMonth: boolean;
  isToday: boolean;
  hasMilestone: boolean;
}

/**
 * One month-grid cell. Dense but uncrammed (brief): a leading category dot +
 * distance, the weekday number, and — only when it matters — a functional
 * status dot. Race days get the accent-chrome chip; today gets a cyan chrome
 * ring; rest days sit quiet. Real detail lives on /day/[date].
 */
export function DayCell({ cell, date, inMonth, isToday, hasMilestone }: DayCellProps) {
  const dom = dayOfMonth(date);

  // Non-plan day (padding or outside the plan span): inert, dimmed.
  if (!cell) {
    return (
      <div
        className={cn(
          'relative min-h-[5.25rem] rounded-sd-tile border border-transparent p-1.5',
          'sd-numeral text-[11px]',
          inMonth ? 'text-sd-ink-faint/70' : 'text-sd-ink-faint/35',
        )}
      >
        {dom}
      </div>
    );
  }

  const { primary, status, day } = cell;
  const cat = categoryMeta(primary?.category ?? null);
  const statusMeta = STATUS_META[status];
  const isRace = cat.accent === true;
  const km = kmValue(day.planned_run_km);

  return (
    <Link
      href={`/day/${date}`}
      aria-label={`${date}, ${primary?.title ?? 'session'}${
        km ? `, ${km} km` : ''
      }, ${statusMeta.label}`}
      className={cn(
        'sd-lift group relative flex min-h-[5.25rem] flex-col gap-1 overflow-hidden rounded-sd-tile border p-1.5',
        'outline-none',
        isToday
          ? 'border-sd-accent/60 bg-sd-selected-item'
          : 'border-sd-line/70 bg-sd-box/40 hover:bg-sd-hover hover:border-sd-line',
        status === 'rest' && !isToday && 'bg-sd-dark-box/40',
      )}
      style={
        isToday
          ? { boxShadow: '0 0 0 1px var(--sd-accent), 0 0 14px var(--hud-cyan-glow)' }
          : undefined
      }
    >
      {/* Header: day number + optional milestone marker + status dot */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'sd-numeral text-[11px] leading-none',
            isToday ? 'font-semibold text-sd-accent-faint' : 'text-sd-ink-faint',
          )}
        >
          {dom}
        </span>
        <span className="flex items-center gap-1">
          {hasMilestone ? (
            <span
              aria-hidden
              title="Milestone"
              className="size-1.5 rotate-45 rounded-[1px] bg-sd-accent"
              style={{ boxShadow: '0 0 6px color-mix(in srgb, var(--sd-accent) 60%, transparent)' }}
            />
          ) : null}
          {statusMeta.emphasized && statusMeta.hueVar ? (
            <span
              aria-hidden
              title={statusMeta.label}
              className="size-1.5 rounded-full"
              style={{ background: `var(${statusMeta.hueVar})` }}
            />
          ) : null}
        </span>
      </div>

      {/* Body */}
      {isRace ? (
        <span
          className="mt-auto inline-flex w-fit items-center gap-1 rounded-sd-chrome border px-1.5 py-0.5 text-tiny font-semibold uppercase tracking-[0.1em]"
          style={accentChip}
        >
          <TrophyGlyph width={11} height={11} />
          Race
        </span>
      ) : (
        <div className="mt-auto flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            {cat.hueVar ? (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: `var(${cat.hueVar})` }}
              />
            ) : (
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-sd-ink-faint/50" />
            )}
            <span className="truncate text-[11px] leading-tight text-sd-ink-dull group-hover:text-sd-ink">
              {status === 'rest' ? 'Rest' : primary?.title ?? 'Session'}
            </span>
          </div>
          {km ? (
            <span className="sd-numeral pl-2.5 text-[11px] font-medium leading-none text-sd-ink">
              {km}
              <span className="ml-0.5 text-[9px] font-normal text-sd-ink-faint">km</span>
            </span>
          ) : null}
        </div>
      )}
    </Link>
  );
}
