"use client";

import type { WeekData, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";
import { Gauge } from "../gauge";

interface Props {
  data: WeekData;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/** Current-week volume gauge: logged vs planned range, with a phase chip. */
export function WeekVolumeWidget({ data, onOpen }: Props) {
  const { loggedKm, plannedKm, rangeMin, rangeMax, phaseLabel, hasLogs } = data;
  const target = rangeMax ?? plannedKm;
  const rangeLabel =
    rangeMin != null && rangeMax != null
      ? `${rangeMin}-${rangeMax} km`
      : plannedKm > 0
        ? `${plannedKm} km`
        : "planned";

  return (
    <WidgetCard
      overlayKey="week"
      label="week volume"
      onOpen={onOpen}
      bodyClassName="p-4 sm:p-5"
    >
      <WidgetLabel>Week volume</WidgetLabel>
      <div className="flex min-h-0 flex-1 items-center justify-center py-1">
        <Gauge
          value={loggedKm}
          max={target}
          rangeMin={rangeMin}
          rangeMax={rangeMax}
          size={124}
        >
          <span
            className="font-sans font-bold leading-none text-sd-ink"
            style={{ fontSize: "clamp(1.4rem, 2.4vw, 2rem)" }}
          >
            {hasLogs ? loggedKm.toFixed(1) : "0"}
          </span>
          <span className="sd-numeral mt-0.5 text-tiny text-sd-ink-faint">
            / {rangeLabel}
          </span>
        </Gauge>
      </div>
      <span className="truncate text-center text-tiny text-sd-ink-dull">
        {phaseLabel}
      </span>
    </WidgetCard>
  );
}
