import Link from 'next/link';
import { cn } from '@/lib/design/cn';
import { TrophyGlyph } from '@/components/ui/icons';
import type { HeatmapCell } from '@/lib/db/stats';
import { isoToDate, mondayIndex, shortDateLabel } from '@/components/calendar/date-utils';

/**
 * TrainingHeatmap: a GitHub-contributions-style grid of the whole plan
 * (hand-built divs, no chart library). Columns are plan weeks (Mon-Sun rows);
 * one cell per plan day. Cell intensity encodes that day's COMPLETED running
 * volume in five accent steps from empty to the plan's single-day maximum,
 * using the design-system accent scale.
 *
 * Because the plan begins 2026-07-13 and logs accrue over time, most cells have
 * no completed volume yet. Three quiet tiers keep the empty state intentional:
 *   - rest / non-running days sit recessed (--sd-dark-box);
 *   - planned-but-not-run days sit lifted with a hairline (--sd-input), subtly
 *     distinct from rest;
 *   - completed days climb the accent scale.
 * Today is ringed like the calendar; race day gets the accent-chrome finish
 * treatment. Each cell links to /day/[date] and carries a native tooltip +
 * aria-label. All colours are tokens; entrance is CSS-only and reduced-motion
 * safe.
 */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export interface TrainingHeatmapProps {
  cells: HeatmapCell[];
  /** ISO 'YYYY-MM-DD' pinning the today ring. */
  today: string;
  /** Plan's single-day completed-km ceiling (the intensity scale top). */
  maxDayVolumeKm: number;
}

interface Column {
  weekNumber: number;
  /** Seven slots indexed by weekday (0 = Mon … 6 = Sun); null where absent. */
  slots: (HeatmapCell | null)[];
  /** Month of the column's earliest dated cell, for the top label row. */
  monthIndex: number;
}

/** Accent intensity step (1..5) for a completed day's volume, 0 when none. */
function intensityLevel(volumeKm: number, maxKm: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (volumeKm <= 0 || maxKm <= 0) return 0;
  const step = Math.ceil((volumeKm / maxKm) * 5);
  return Math.min(5, Math.max(1, step)) as 1 | 2 | 3 | 4 | 5;
}

const LEVEL_BG: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'color-mix(in srgb, var(--sd-accent) 24%, var(--sd-box))',
  2: 'color-mix(in srgb, var(--sd-accent) 44%, var(--sd-box))',
  3: 'color-mix(in srgb, var(--sd-accent) 64%, var(--sd-box))',
  4: 'color-mix(in srgb, var(--sd-accent) 82%, var(--sd-box))',
  5: 'var(--sd-accent)',
};

function buildColumns(cells: HeatmapCell[]): Column[] {
  const byWeek = new Map<number, HeatmapCell[]>();
  for (const c of cells) {
    const list = byWeek.get(c.weekNumber) ?? [];
    list.push(c);
    byWeek.set(c.weekNumber, list);
  }
  return [...byWeek.keys()]
    .sort((a, b) => a - b)
    .map((weekNumber) => {
      const slots: (HeatmapCell | null)[] = [null, null, null, null, null, null, null];
      let earliest: string | null = null;
      for (const c of byWeek.get(weekNumber)!) {
        slots[mondayIndex(c.date)] = c;
        if (earliest == null || c.date < earliest) earliest = c.date;
      }
      const monthIndex = earliest ? isoToDate(earliest).getUTCMonth() : 0;
      return { weekNumber, slots, monthIndex };
    });
}

export function TrainingHeatmap({ cells, today, maxDayVolumeKm }: TrainingHeatmapProps) {
  const columns = buildColumns(cells);
  const loggedDays = cells.filter((c) => c.hasLog).length;

  // Month labels: show a label above the first column of each calendar month.
  const monthLabelFor = (col: Column, i: number): string => {
    if (i === 0) return MONTHS_SHORT[col.monthIndex];
    return columns[i - 1].monthIndex === col.monthIndex ? '' : MONTHS_SHORT[col.monthIndex];
  };

  return (
    <figure className="flex flex-col gap-4">
      <figcaption className="flex flex-col gap-1">
        <span className="sd-stat-label" id="heatmap-title">
          Training heatmap
        </span>
        <span className="text-sm text-sd-ink-dull">
          {loggedDays > 0
            ? 'One cell per plan day across all 14 weeks. Brighter cells are bigger logged days.'
            : 'One cell per plan day across all 14 weeks. Cells brighten as sessions get logged; the plan is still ahead.'}
        </span>
      </figcaption>

      <div className="overflow-x-auto pb-1">
        <div
          className="sd-enter flex w-fit gap-2"
          role="group"
          aria-labelledby="heatmap-title"
        >
          {/* Weekday label rail */}
          <div className="flex flex-col gap-[3px] pt-[18px]" aria-hidden>
            {WEEKDAY_LABELS.map((wd, i) => (
              <span
                key={i}
                className="flex h-4 items-center pr-1 text-[9px] leading-none text-sd-ink-faint"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Columns: one per plan week */}
          <div className="flex flex-col gap-1">
            {/* Month labels */}
            <div className="flex gap-[3px]" aria-hidden>
              {columns.map((col, i) => (
                <span
                  key={col.weekNumber}
                  className="w-4 text-[9px] leading-none text-sd-ink-faint"
                >
                  {monthLabelFor(col, i)}
                </span>
              ))}
            </div>

            {/* The grid body */}
            <div className="flex gap-[3px]">
              {columns.map((col) => (
                <div key={col.weekNumber} className="flex flex-col gap-[3px]">
                  {col.slots.map((cell, wd) =>
                    cell ? (
                      <HeatCell
                        key={cell.date}
                        cell={cell}
                        isToday={cell.date === today}
                        maxKm={maxDayVolumeKm}
                      />
                    ) : (
                      <span key={`empty-${col.weekNumber}-${wd}`} className="size-4" aria-hidden />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <HeatmapLegend />
    </figure>
  );
}

interface HeatCellProps {
  cell: HeatmapCell;
  isToday: boolean;
  maxKm: number;
}

function HeatCell({ cell, isToday, maxKm }: HeatCellProps) {
  const level = intensityLevel(cell.completedKm, maxKm);
  const planned = cell.plannedKm > 0;

  // Resolve the cell fill across the three quiet tiers + the accent scale.
  let background = 'var(--sd-dark-box)'; // rest / non-running: recessed
  let border = '1px solid transparent';
  if (cell.isRace) {
    background = level > 0 ? LEVEL_BG[Math.max(level, 3) as 3 | 4 | 5] : 'color-mix(in srgb, var(--sd-accent) 12%, var(--sd-box))';
    border = '1px solid color-mix(in srgb, var(--sd-accent) 45%, var(--sd-line))';
  } else if (level > 0) {
    background = LEVEL_BG[level as 1 | 2 | 3 | 4 | 5];
    border = '1px solid color-mix(in srgb, var(--sd-accent) 20%, transparent)';
  } else if (planned) {
    background = 'var(--sd-input)'; // planned but not run: lifted, hairline
    border = '1px solid var(--sd-line)';
  }

  const tip = [
    shortDateLabel(cell.date),
    cell.isRace ? 'Race day' : null,
    cell.isRest ? 'Rest' : `planned ${cell.plannedKm} km`,
    cell.hasLog ? `done ${cell.completedKm} km` : planned ? 'not logged' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/day/${cell.date}`}
      // ~93 day cells render at once (including inside the dashboard's heatmap
      // overlay); eager RSC prefetches from them abort noisily when the overlay
      // closes, so prefetch on navigation intent only.
      prefetch={false}
      title={tip}
      aria-label={tip}
      className="sd-soft-hover relative grid size-4 place-items-center rounded-[3px] outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--sd-accent)]"
      style={{
        background,
        border,
        boxShadow: isToday
          ? '0 0 0 1px var(--sd-accent), 0 0 10px var(--hud-cyan-glow)'
          : undefined,
      }}
    >
      {cell.isRace ? (
        <TrophyGlyph width={9} height={9} style={{ color: 'var(--sd-accent-ink)' }} />
      ) : null}
    </Link>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[10.4px] text-sd-ink-faint">Less</span>
        {([0, 1, 2, 3, 4, 5] as const).map((lvl) => (
          <span
            key={lvl}
            aria-hidden
            className="size-3 rounded-[3px]"
            style={{
              background: lvl === 0 ? 'var(--sd-input)' : LEVEL_BG[lvl as 1 | 2 | 3 | 4 | 5],
              border: lvl === 0 ? '1px solid var(--sd-line)' : undefined,
            }}
          />
        ))}
        <span className="text-[10.4px] text-sd-ink-faint">More</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-3 rounded-[3px]"
          style={{ background: 'var(--sd-dark-box)' }}
        />
        <span className="text-[10.4px] text-sd-ink-dull">Rest</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="grid size-3 place-items-center rounded-[3px]"
          style={{
            background: 'color-mix(in srgb, var(--sd-accent) 12%, var(--sd-box))',
            border: '1px solid color-mix(in srgb, var(--sd-accent) 45%, var(--sd-line))',
          }}
        />
        <span className="text-[10.4px] text-sd-ink-dull">Race day</span>
      </span>
    </div>
  );
}
