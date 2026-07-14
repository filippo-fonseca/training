"use client";

import type { NextMilestoneData, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";

interface Props {
  data: NextMilestoneData | null;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/** Next-milestone chip: name + date + a tiny timeline tick. Opens the journey. */
export function NextMilestoneChip({ data, onOpen }: Props) {
  return (
    <WidgetCard
      overlayKey="journey"
      label="next milestone"
      onOpen={onOpen}
      bodyClassName="flex-row items-center gap-3 p-3 sm:p-4"
    >
      {/* Timeline tick */}
      <div aria-hidden className="flex h-full flex-col items-center justify-center">
        <span className="h-2 w-px bg-sd-line" />
        <span className="size-2 rounded-full border border-sd-accent bg-sd-accent/30" />
        <span className="h-2 w-px bg-sd-line" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <WidgetLabel>Next milestone</WidgetLabel>
        {data ? (
          <>
            <span className="truncate text-sm font-medium text-sd-ink">
              {data.title}
            </span>
            <span className="sd-numeral text-tiny text-sd-ink-faint">
              {data.dateShort ?? "scheduled"}
              {data.daysAway != null ? ` · ${data.daysAway} days` : ""}
            </span>
          </>
        ) : (
          <span className="text-sm text-sd-ink-faint">No upcoming milestones</span>
        )}
      </div>
    </WidgetCard>
  );
}
