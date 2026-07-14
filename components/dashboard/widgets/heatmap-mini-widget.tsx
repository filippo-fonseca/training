"use client";

import type { HeatmapCell } from "@/lib/db/stats";
import type { HeatmapMiniData, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";

interface Props {
  data: HeatmapMiniData;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/** Mon=0..Sun=6 weekday index for an ISO date (date-only, UTC-anchored). */
function mondayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return (day + 6) % 7;
}

/** Colour for one cell: race > logged intensity > planned > rest. Logged volume
 *  (on-plan AND off-plan) drives intensity, so an off-plan run still colours its
 *  cell even though it never completes a planned session (decision D2). */
function cellStyle(cell: HeatmapCell, max: number, isToday: boolean): React.CSSProperties {
  let background = "var(--sd-darker-box)"; // rest / empty
  if (cell.isRace) {
    background = "var(--sd-accent)";
  } else if (cell.completedKm > 0) {
    const ratio = max > 0 ? Math.min(1, cell.completedKm / max) : 0.4;
    const alpha = 0.3 + ratio * 0.7;
    background = `color-mix(in srgb, var(--sd-accent) ${Math.round(alpha * 100)}%, var(--sd-darker-box))`;
  } else if (cell.plannedKm > 0) {
    background = "var(--sd-line)"; // planned, not yet logged
  }
  return {
    background,
    boxShadow: isToday ? "0 0 0 1px var(--sd-accent-faint)" : undefined,
  };
}

/** The contributions heatmap compressed: tiny cells, no month labels. */
export function HeatmapMiniWidget({ data, onOpen }: Props) {
  const { cells, today, maxDayVolumeKm, totalDays } = data;

  // Group into columns by plan week; each column is a Mon..Sun array of cells.
  const byWeek = new Map<number, (HeatmapCell | null)[]>();
  for (const cell of cells) {
    const col = byWeek.get(cell.weekNumber) ?? new Array(7).fill(null);
    col[mondayIndex(cell.date)] = cell;
    byWeek.set(cell.weekNumber, col);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  return (
    <WidgetCard
      overlayKey="heatmap"
      label="training heatmap"
      onOpen={onOpen}
      bodyClassName="p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <WidgetLabel>{totalDays} days</WidgetLabel>
        <span className="sd-stat-label text-sd-ink-faint">Heatmap</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex gap-[3px]" role="img" aria-label={`${totalDays}-day training heatmap`}>
          {weeks.map((wk) => {
            const col = byWeek.get(wk)!;
            return (
              <div key={wk} className="flex flex-col gap-[3px]">
                {col.map((cell, i) =>
                  cell ? (
                    <span
                      key={i}
                      className="size-[9px] rounded-[2px]"
                      style={cellStyle(cell, maxDayVolumeKm, cell.date === today)}
                    />
                  ) : (
                    <span key={i} className="size-[9px] rounded-[2px] bg-transparent" />
                  ),
                )}
              </div>
            );
          })}
        </div>
      </div>
    </WidgetCard>
  );
}
