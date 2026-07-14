import { cn } from '@/lib/design/cn';
import type { PlanWeek } from '@/lib/types/database';
import { chip, accentChip } from './status';
import { kmValue } from './format';

interface WeekRailProps {
  week: PlanWeek | null;
  /** Neutral ladder var used as the phase-band bar (never a functional hue). */
  bandVar: `--${string}`;
}

/** A flag chip's label + tint for the week's structural role. */
function weekFlag(week: PlanWeek): { label: string; accent?: boolean; hueVar?: `--${string}` } | null {
  if (week.is_race_week) return { label: 'Race', accent: true };
  if (week.is_peak) return { label: 'Peak', accent: true };
  if (week.is_taper) return { label: 'Taper', hueVar: '--ink-blue' };
  if (week.is_cutback) return { label: 'Cutback', hueVar: '--ink-amber' };
  return null;
}

/**
 * Left gutter for a month-grid row: week number, phase, long-run distance and a
 * structural flag chip. Hidden on mobile (the grid degrades to bare day cells).
 */
export function WeekRail({ week, bandVar }: WeekRailProps) {
  if (!week) {
    return <div className="hidden sm:block" aria-hidden />;
  }

  const flag = weekFlag(week);
  const longRun = kmValue(week.long_run_km);

  return (
    <div className="relative hidden flex-col justify-center gap-1 py-1.5 pl-2.5 pr-1.5 sm:flex">
      {/* Phase band bar (neutral shade) */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[3px] rounded-full"
        style={{ background: `var(${bandVar})` }}
      />
      <span className="sd-stat-label leading-none">Wk {week.week_index}</span>
      {week.phase_label ? (
        <span
          className="line-clamp-2 text-[10px] leading-tight text-sd-ink-dull"
          title={week.phase_label}
        >
          {week.phase_label}
        </span>
      ) : null}
      {longRun ? (
        <span className="sd-numeral text-[10px] leading-none text-sd-ink-faint">
          LR {longRun}
          <span className="ml-0.5 text-[8px]">km</span>
        </span>
      ) : null}
      {flag ? (
        <span
          className="inline-flex w-fit items-center rounded-sd-chrome border px-1 py-[1px] text-[9px] font-medium uppercase tracking-[0.06em]"
          style={
            flag.accent
              ? accentChip
              : { ...chip(flag.hueVar as `--${string}`), color: 'var(--sd-ink-dull)' }
          }
        >
          {flag.label}
        </span>
      ) : null}
    </div>
  );
}
