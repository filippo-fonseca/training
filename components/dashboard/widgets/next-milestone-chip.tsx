"use client";

import { useCallback, type KeyboardEvent } from "react";
import type { CompactMilestone, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";
import { BrowseControls, ResetChip } from "./browse-controls";

interface Props {
  /** The full milestone/checkpoint timeline (13 entries), chronological. */
  milestones: CompactMilestone[];
  /** Index of the next upcoming entry (default selection + reset target). */
  nextIndex: number;
  /** The currently browsed entry (owned by the shell). */
  selectedIndex: number;
  onSelect: (index: number) => void;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/**
 * Next-milestone chip with a timeline browser. Defaults to the next upcoming
 * entry; the header chevrons (and Left/Right arrow keys while focused) walk the
 * full milestone + checkpoint timeline. Name + date + a tiny n/13 position tick.
 * Opens the journey overlay (unchanged). Fixed size, sd-enter replay per browse.
 */
export function NextMilestoneChip({
  milestones,
  nextIndex,
  selectedIndex,
  onSelect,
  onOpen,
}: Props) {
  const total = milestones.length;
  const entry = selectedIndex >= 0 ? milestones[selectedIndex] : null;
  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex >= 0 && selectedIndex < total - 1;
  const isNext = selectedIndex === nextIndex;

  const goPrev = useCallback(() => {
    if (canPrev) onSelect(selectedIndex - 1);
  }, [canPrev, selectedIndex, onSelect]);
  const goNext = useCallback(() => {
    if (canNext) onSelect(selectedIndex + 1);
  }, [canNext, selectedIndex, onSelect]);

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

  const subLabel = entry
    ? [
        entry.dateLabel,
        total > 0 ? `${selectedIndex + 1}/${total}` : null,
        entry.targetKm != null ? `${entry.targetKm} km` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="relative h-full" onKeyDown={onKeyDown}>
      <WidgetCard
        overlayKey="journey"
        label="the milestone timeline"
        onOpen={onOpen}
        bodyClassName="flex-row items-center gap-3 p-3 sm:p-4"
      >
        {/* Timeline tick */}
        <div aria-hidden className="flex h-full flex-col items-center justify-center">
          <span className="h-2 w-px bg-sd-line" />
          <span className="size-2 rounded-full border border-sd-accent bg-sd-accent/30" />
          <span className="h-2 w-px bg-sd-line" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col pr-24">
          <WidgetLabel>
            {entry?.kind === "checkpoint" ? "Checkpoint" : "Milestone"}
          </WidgetLabel>
          {entry ? (
            <div key={selectedIndex} className="sd-enter flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-sd-ink" title={entry.title}>
                {entry.title}
              </span>
              <span className="sd-numeral truncate text-tiny text-sd-ink-faint">
                {subLabel}
              </span>
            </div>
          ) : (
            <span className="text-sm text-sd-ink-faint">No upcoming milestones</span>
          )}
        </div>
      </WidgetCard>

      {total > 0 ? (
        <BrowseControls
          reset={
            !isNext ? (
              <ResetChip onClick={() => onSelect(nextIndex)}>Next</ResetChip>
            ) : undefined
          }
          canPrev={canPrev}
          canNext={canNext}
          onPrev={goPrev}
          onNext={goNext}
          prevLabel="Previous milestone"
          nextLabel="Next milestone"
        />
      ) : null}
    </div>
  );
}
