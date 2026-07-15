"use client";

import { useCallback, type KeyboardEvent } from "react";
import type { WeekEntry, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";
import { Gauge } from "../gauge";
import { BrowseControls, ResetChip } from "./browse-controls";

interface Props {
  /** Every plan week (1..14), for prev/next browsing. */
  weeks: WeekEntry[];
  /** The current week (default selection + reset target). */
  currentWeekIndex: number;
  /** Total plan weeks, for the "WEEK n OF 14" label. */
  totalWeeks: number;
  /** The currently browsed week (owned by the shell). */
  selectedWeekIndex: number;
  onSelectWeek: (weekIndex: number) => void;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/**
 * Week-volume gauge with a week browser. Defaults to the current week and reads
 * its logged-vs-planned-range exactly as before; the header chevrons (and
 * Left/Right arrow keys while focused) walk weeks 1..14 and swap the gauge to
 * that week's figures. Fixed internal layout, so browsing never resizes the
 * card. Expands to the weekly-volume overlay (unchanged).
 */
export function WeekVolumeWidget({
  weeks,
  currentWeekIndex,
  totalWeeks,
  selectedWeekIndex,
  onSelectWeek,
  onOpen,
}: Props) {
  const index = weeks.findIndex((w) => w.weekIndex === selectedWeekIndex);
  const week = index >= 0 ? weeks[index] : null;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < weeks.length - 1;
  const isCurrent = selectedWeekIndex === currentWeekIndex;

  const goPrev = useCallback(() => {
    if (canPrev) onSelectWeek(weeks[index - 1].weekIndex);
  }, [canPrev, weeks, index, onSelectWeek]);
  const goNext = useCallback(() => {
    if (canNext) onSelectWeek(weeks[index + 1].weekIndex);
  }, [canNext, weeks, index, onSelectWeek]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext],
  );

  const loggedKm = week?.loggedKm ?? 0;
  const plannedKm = week?.plannedKm ?? 0;
  const rangeMin = week?.rangeMin ?? null;
  const rangeMax = week?.rangeMax ?? null;
  const hasLogs = week?.hasLogs ?? false;
  const target = rangeMax ?? plannedKm;
  const rangeLabel =
    rangeMin != null && rangeMax != null
      ? `${rangeMin}-${rangeMax} km`
      : plannedKm > 0
        ? `${plannedKm} km`
        : "planned";

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="relative h-full" onKeyDown={onKeyDown}>
      <WidgetCard
        overlayKey="week"
        label="week volume"
        onOpen={onOpen}
        bodyClassName="p-4 sm:p-5"
      >
        <div className="flex min-w-0 items-start pr-24">
          <WidgetLabel>{`Week ${selectedWeekIndex} of ${totalWeeks}`}</WidgetLabel>
        </div>
        <div
          key={selectedWeekIndex}
          className="sd-enter flex min-h-0 flex-1 items-center justify-center py-1"
        >
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
        <span
          className="truncate text-center text-tiny text-sd-ink-dull"
          title={week?.phaseLabel ?? ""}
        >
          {week?.phaseLabel ?? ""}
        </span>
      </WidgetCard>

      <BrowseControls
        reset={
          !isCurrent ? (
            <ResetChip onClick={() => onSelectWeek(currentWeekIndex)}>
              This week
            </ResetChip>
          ) : undefined
        }
        canPrev={canPrev}
        canNext={canNext}
        onPrev={goPrev}
        onNext={goNext}
        prevLabel="Previous week"
        nextLabel="Next week"
      />
    </div>
  );
}
