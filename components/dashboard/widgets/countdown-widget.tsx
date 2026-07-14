"use client";

import type { CountdownData, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";

interface Props {
  data: CountdownData;
  dayNumber: number;
  totalDays: number;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/**
 * Top-left anchor: DAYS TO RACE label, a huge Grotesk numeral over a soft cyan
 * glow (behind the numeral ONLY), the race chip, and a thin week-progress rail.
 * Expands to the full journey overlay.
 */
export function CountdownWidget({ data, dayNumber, totalDays, onOpen }: Props) {
  const {
    daysToRace,
    status,
    raceName,
    raceDistanceKm,
    raceDateShort,
    weekIndex,
    totalWeeks,
    phaseLabel,
    phaseProgress,
  } = data;

  const numeral =
    status === "past" ? "0" : status === "today" ? "RACE" : `${daysToRace}`;

  return (
    <WidgetCard
      overlayKey="journey"
      label="countdown to race"
      onOpen={onOpen}
      bodyClassName="p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <WidgetLabel>Days to race</WidgetLabel>
        <span className="sd-stat-label text-sd-accent-faint">
          Day {dayNumber} of {totalDays}
        </span>
      </div>

      {/* Numeral + its glow. The glow is confined behind the numeral. */}
      <div className="relative flex min-h-0 flex-1 items-center">
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 -z-0 h-[130%] w-[70%] -translate-y-1/2"
          style={{ background: "var(--sd-glow)" }}
        />
        <span
          className="relative z-10 font-sans font-bold leading-[0.9] tracking-tight text-sd-ink sd-punch"
          style={{ fontSize: "clamp(3rem, 6.5vw, 5.5rem)" }}
        >
          {numeral}
        </span>
      </div>

      {/* Race chip */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="truncate rounded-full border border-sd-line bg-sd-darker-box px-2 py-1 text-tiny text-sd-ink-dull">
          {raceName}
          {raceDistanceKm != null ? ` · ${raceDistanceKm} km` : ""}
          {raceDateShort ? ` · ${raceDateShort}` : ""}
        </span>
      </div>

      {/* Week-progress rail */}
      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-center justify-between text-tiny text-sd-ink-faint">
          <span className="sd-numeral">
            Week {weekIndex} of {totalWeeks}
          </span>
          <span className="truncate pl-2 text-right">{phaseLabel}</span>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-sd-darker-box"
          role="progressbar"
          aria-valuenow={Math.round(phaseProgress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="sd-progress-fill h-full rounded-full bg-sd-accent"
            style={{ width: `${Math.max(4, Math.round(phaseProgress * 100))}%` }}
          />
        </div>
      </div>
    </WidgetCard>
  );
}
