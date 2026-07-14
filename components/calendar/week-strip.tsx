import Link from 'next/link';
import { cn } from '@/lib/design/cn';
import { Panel } from '@/components/ui/panel';
import { ProgressBar } from '@/components/ui/progress-bar';
import { TrophyGlyph, CalendarGlyph } from '@/components/ui/icons';
import { staggerStyle } from '@/lib/design/motion';
import type { CalendarData, CalendarDay } from './data';
import type { Milestone } from '@/lib/types/database';
import { categoryMeta, STATUS_META, accentChip } from './status';
import { formatKm, kmValue, sumKm } from './format';
import { weekdayShort, shortDateLabel } from './date-utils';

interface WeekStripProps {
  data: CalendarData;
  weekIndex: number;
}

/**
 * Week view. One plan week as a 7-day strip: both session slots per day plus the
 * weekly kilometre total, planned vs logged. Days link through to full detail.
 */
export function WeekStrip({ data, weekIndex }: WeekStripProps) {
  const week = data.weeksByIndex.get(weekIndex) ?? null;
  const days = [...data.daysByDate.values()]
    .filter((c) => c.day.week_number === weekIndex)
    .sort((a, b) => a.day.date.localeCompare(b.day.date));

  const plannedKm = week?.planned_km ?? sumKm(days.map((d) => d.day.planned_run_km));
  const loggedKm = sumKm(days.map((d) => d.log?.actual_distance_km ?? null));
  const pct = plannedKm > 0 ? (loggedKm / plannedKm) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Weekly summary */}
      <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="sd-stat-label">Week {weekIndex}</span>
          <h2 className="text-lg font-semibold text-sd-ink">{week?.phase_label ?? 'Week'}</h2>
          {week?.range_min_km != null && week?.range_max_km != null ? (
            <span className="sd-numeral text-xs text-sd-ink-faint">
              Range {kmValue(week.range_min_km)}-{kmValue(week.range_max_km)} km
              {week.long_run_km ? ` · long run ${kmValue(week.long_run_km)} km` : ''}
            </span>
          ) : null}
        </div>
        <div className="w-full sm:max-w-xs">
          <ProgressBar
            value={pct}
            label="Logged vs planned"
            valueLabel={`${kmValue(loggedKm) || '0'} / ${kmValue(plannedKm) || '--'} km`}
          />
        </div>
      </Panel>

      {week?.coaching_note ? (
        <p className="max-w-3xl text-sm leading-relaxed text-sd-ink-dull">{week.coaching_note}</p>
      ) : null}

      {/* 7-day strip */}
      <div className="overflow-hidden rounded-sd-card border border-sd-line bg-sd-box/30">
        {days.length === 0 ? (
          <p className="p-5 text-sm text-sd-ink-faint">No days found for this week.</p>
        ) : (
          days.map((cell, i) => (
            <WeekDayRow
              key={cell.day.date}
              cell={cell}
              isToday={cell.day.date === data.today}
              index={i}
              checkpoint={hasDecisionCheckpoint(data.milestonesByDate.get(cell.day.date))}
            />
          ))
        )}
      </div>
    </div>
  );
}

/** True when a day carries a decision checkpoint, the plan's 4 traffic-light
 *  gate points where the coming week's load depends on how the body responds. */
function hasDecisionCheckpoint(milestones: Milestone[] | undefined): boolean {
  return (milestones ?? []).some((m) => m.type === 'decision_checkpoint');
}

function WeekDayRow({
  cell,
  isToday,
  index,
  checkpoint,
}: {
  cell: CalendarDay;
  isToday: boolean;
  index: number;
  checkpoint: boolean;
}) {
  const { day, primary, secondary, status, log } = cell;
  const cat = categoryMeta(primary?.category ?? null);
  const statusMeta = STATUS_META[status];
  const isRace = cat.accent === true;
  const km = kmValue(day.planned_run_km);

  return (
    <Link
      href={`/day/${day.date}`}
      style={staggerStyle(index)}
      className={cn(
        'sd-enter sd-lift flex items-stretch gap-3 border-b border-sd-line/60 px-3 py-3 outline-none last:border-b-0 hover:bg-sd-hover hover:border-sd-line sm:px-4',
        isToday && 'bg-sd-selected-item',
      )}
    >
      {/* Date column */}
      <div className="flex w-12 shrink-0 flex-col items-center justify-center border-r border-sd-line/50 pr-3">
        <span
          className={cn(
            'text-[10px] uppercase tracking-wide',
            isToday ? 'text-sd-accent-faint' : 'text-sd-ink-faint',
          )}
        >
          {weekdayShort(day.date)}
        </span>
        <span
          className={cn(
            'sd-numeral text-lg font-semibold leading-tight',
            isToday ? 'text-sd-accent-faint' : 'text-sd-ink',
          )}
        >
          {day.date.slice(8)}
        </span>
      </div>

      {/* Sessions */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex items-center gap-2">
          {isRace ? (
            <span
              className="inline-flex items-center gap-1 rounded-sd-chrome border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={accentChip}
            >
              <TrophyGlyph width={11} height={11} />
              Race
            </span>
          ) : (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: cat.hueVar ? `var(${cat.hueVar})` : 'var(--sd-ink-faint)' }}
            />
          )}
          <span className="truncate text-sm font-medium text-sd-ink">
            {status === 'rest' ? 'Rest' : primary?.title ?? 'Session'}
          </span>
          {checkpoint ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-sd-chrome border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={accentChip}
              title="Decision checkpoint: this day's result gates the coming week's load."
            >
              <CalendarGlyph width={11} height={11} />
              Checkpoint
            </span>
          ) : null}
        </div>
        {secondary?.title ? (
          <span className="truncate pl-4 text-xs text-sd-ink-faint">+ {secondary.title}</span>
        ) : null}
        {primary && (primary.pace_text || primary.rpe_text) ? (
          <span className="truncate pl-4 text-xs text-sd-ink-dull">
            {[primary.pace_text, primary.rpe_text ? `RPE ${primary.rpe_text}` : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        ) : null}
      </div>

      {/* Right: km + status */}
      <div className="flex shrink-0 flex-col items-end justify-center gap-1">
        <span className="sd-numeral text-sm font-semibold text-sd-ink">
          {km ? `${km} km` : status === 'rest' ? '--' : ''}
        </span>
        {log?.actual_distance_km != null ? (
          <span className="sd-numeral text-[10px] text-ink-sage">
            logged {formatKm(log.actual_distance_km)}
          </span>
        ) : statusMeta.emphasized && statusMeta.hueVar ? (
          <span className="flex items-center gap-1 text-[10px] text-sd-ink-faint">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: `var(${statusMeta.hueVar})` }}
            />
            {statusMeta.label}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
