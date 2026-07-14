import { cn } from '@/lib/design/cn';
import type { PlanWeek } from '@/lib/types/database';
import type { CalendarData } from './data';
import { DayCell } from './day-cell';
import { WeekRail } from './week-rail';
import { staggerStyle } from '@/lib/design/motion';
import { monthGrid, monthKey, type ISODate } from './date-utils';

const WEEKDAY_HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface MonthGridProps {
  data: CalendarData;
  month: string; // 'YYYY-MM'
}

/**
 * Month view. A Monday-start grid where each full row is exactly one plan week
 * (the plan runs Mon-Sun), so the left rail bands the row by phase and flags
 * (cutback / taper / peak / race). Day cells carry the type + status; a whole
 * plan spans 14 weeks reachable by month navigation.
 */
export function MonthGrid({ data, month }: MonthGridProps) {
  const rows = monthGrid(month);
  // Stable phase → band-shade index, following the plan's phase order.
  const phaseOrder = phaseBandIndex(data.weeks);

  return (
    <div className="overflow-hidden rounded-sd-card border border-sd-line bg-sd-box/30">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-sd-line bg-sd-dark-box/50 sm:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <div className="hidden sm:block" aria-hidden />
        {WEEKDAY_HEADS.map((wd) => (
          <div
            key={wd}
            className="sd-stat-label px-2 py-2 text-center"
          >
            <span className="hidden sm:inline">{wd}</span>
            <span className="sm:hidden">{wd[0]}</span>
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-col">
        {rows.map((row, rowIdx) => {
          const week = weekForRow(row, data);
          const special = week
            ? week.is_cutback || week.is_taper || week.is_race_week || week.is_peak
            : false;
          return (
            <div
              key={row[0]}
              className={cn(
                'sd-enter grid grid-cols-7 border-b border-sd-line/70 last:border-b-0 sm:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]',
                special && 'bg-sd-dark-box/40',
              )}
              style={staggerStyle(rowIdx)}
            >
              <WeekRail
                week={week}
                bandVar={week ? phaseOrder.get(week.phase_label ?? '') ?? '--sd-line' : '--sd-line'}
              />
              <div className="col-span-7 grid grid-cols-7">
                {row.map((date) => {
                  const cell = data.daysByDate.get(date) ?? null;
                  return (
                    <div key={date} className="border-l border-sd-line/40 p-1 first:border-l-0">
                      <DayCell
                        cell={cell}
                        date={date}
                        inMonth={monthKey(date) === month}
                        isToday={date === data.today}
                        hasMilestone={(data.milestonesByDate.get(date)?.length ?? 0) > 0}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Pick the plan week a grid row belongs to (first plan day in the row wins). */
function weekForRow(row: ISODate[], data: CalendarData): PlanWeek | null {
  for (const date of row) {
    const cell = data.daysByDate.get(date);
    if (cell?.day.week_number != null) {
      const wk = data.weeksByIndex.get(cell.day.week_number);
      if (wk) return wk;
    }
  }
  return null;
}

/**
 * Map each distinct phase label to a neutral ladder shade so consecutive phases
 * read as bands. Neutral only — functional hues stay reserved for dots/chips.
 */
function phaseBandIndex(weeks: PlanWeek[]): Map<string, `--${string}`> {
  const shades: `--${string}`[] = ['--sd-line', '--sd-frame', '--sd-active', '--sd-selected'];
  const map = new Map<string, `--${string}`>();
  let i = 0;
  for (const w of weeks) {
    const label = w.phase_label ?? '';
    if (!map.has(label)) {
      map.set(label, shades[i % shades.length]);
      i += 1;
    }
  }
  return map;
}
