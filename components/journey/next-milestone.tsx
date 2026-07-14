import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  DimensionalIcon,
  CalendarGlyph,
  FlameGlyph,
  TimerGlyph,
  TrophyGlyph,
  HeartGlyph,
} from "@/components/ui/icons";
import type { MilestoneType } from "@/lib/db";
import type { JourneyView } from "./journey-model";
import { formatShortDate } from "./journey-time";

function glyphFor(type: MilestoneType): ReactNode {
  switch (type) {
    case "race":
      return <TrophyGlyph />;
    case "key_workout":
      return <FlameGlyph />;
    case "gated_long_run":
      return <TimerGlyph />;
    case "cutback_week":
      return <HeartGlyph />;
    default:
      return <CalendarGlyph />;
  }
}

export function NextMilestone({ view }: { view: JourneyView }) {
  const next = view.nextMilestone;

  if (!next) {
    const racePast = view.race.countdown.status === "past";
    return (
      <Panel className="flex flex-col gap-2">
        <span className="sd-stat-label">Next milestone</span>
        <p className="text-sm text-sd-ink-dull">
          {racePast
            ? "Every milestone is behind us. All that is left was the finish."
            : "No milestone is on the calendar ahead. The next block will bring the first checkpoint."}
        </p>
      </Panel>
    );
  }

  const { milestone, daysAway } = next;
  const away =
    daysAway == null
      ? milestone.week_number != null
        ? `Week ${milestone.week_number}`
        : "Upcoming"
      : daysAway === 0
        ? "Today"
        : `${daysAway} day${daysAway === 1 ? "" : "s"} away`;

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DimensionalIcon size={34}>{glyphFor(milestone.type)}</DimensionalIcon>
          <div className="flex min-w-0 flex-col">
            <span className="sd-stat-label">Next milestone</span>
            <span className="text-base font-semibold leading-tight tracking-tight text-sd-ink">
              {milestone.title}
            </span>
          </div>
        </div>
        <StatusPill tone="pending" label={away} />
      </div>

      {milestone.description ? (
        <p className="text-sm leading-relaxed text-sd-ink-dull">{milestone.description}</p>
      ) : null}

      {milestone.date ? (
        <div className="flex flex-col gap-1 border-t border-sd-line pt-3">
          <span className="sd-stat-label">Scheduled</span>
          <span className="sd-numeral text-sm text-sd-ink">{formatShortDate(milestone.date)}</span>
        </div>
      ) : null}
    </Panel>
  );
}
