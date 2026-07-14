import type { JourneyView } from "@/components/journey/journey-model";
import type { ProgressData } from "@/app/(public)/progress/_data";
import { cn } from "@/lib/design/cn";
import { OverlayHeader, OverlayFooter, OverlaySection, overlayTitleId } from "./overlay-chrome";

const MANIFESTO = "Rebuilding from injury to the Baystate Half. In public.";

/**
 * The Countdown / next-milestone expand: the full journey view. The manifesto,
 * a big race countdown, and a phase rail of the whole plan with the current
 * week highlighted (phase membership by date containment, migration 0008).
 */
export function JourneyOverlay({
  view,
  progress,
}: {
  view: JourneyView;
  progress: ProgressData;
}) {
  const { race, weekIndex, totalWeeks, phaseLabel, nextMilestone } = view;
  const days = race.countdown.days;
  const numeral = days > 0 ? days : 0;

  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow="The comeback"
        title="The journey"
        titleId={overlayTitleId("journey")}
        subtitle={MANIFESTO}
      />

      <div className="flex flex-wrap items-end gap-6 rounded-sd-card border border-sd-line bg-sd-darker-box/50 p-5">
        <div className="flex flex-col">
          <span className="sd-stat-label">Days to race</span>
          <span className="font-sans text-5xl font-bold leading-none tracking-tight text-sd-ink">
            {numeral}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="sd-numeral text-sm text-sd-ink-dull">
            {race.name}
            {race.distanceKm != null ? ` · ${race.distanceKm} km` : ""}
          </span>
          <span className="sd-numeral text-tiny text-sd-ink-faint">
            Week {weekIndex} of {totalWeeks} · {phaseLabel}
          </span>
        </div>
      </div>

      <OverlaySection title="Phase progression">
        <ol className="flex flex-col gap-1.5">
          {progress.phases.map((p) => {
            const current = weekIndex >= p.startWeek && weekIndex <= p.endWeek;
            return (
              <li
                key={`${p.name}-${p.startWeek}`}
                className={cn(
                  "flex items-center gap-3 rounded-sd-tile border px-3 py-2",
                  current
                    ? "border-sd-accent/40 bg-sd-accent/10"
                    : "border-sd-line bg-sd-box/40",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full",
                    current ? "bg-sd-accent" : "bg-sd-line",
                  )}
                />
                <span className={cn("flex-1 text-sm", current ? "text-sd-ink" : "text-sd-ink-dull")}>
                  {p.name}
                </span>
                <span className="sd-numeral text-tiny text-sd-ink-faint">
                  {p.startWeek === p.endWeek
                    ? `Wk ${p.startWeek}`
                    : `Wk ${p.startWeek}-${p.endWeek}`}
                </span>
              </li>
            );
          })}
        </ol>
      </OverlaySection>

      {nextMilestone ? (
        <OverlaySection title="Next milestone">
          <div className="flex items-center justify-between gap-3 rounded-sd-tile border border-sd-line bg-sd-box/40 px-3 py-2">
            <span className="text-sm text-sd-ink">{nextMilestone.milestone.title}</span>
            <span className="sd-numeral text-tiny text-sd-ink-faint">
              {nextMilestone.effectiveDate ?? "scheduled"}
              {nextMilestone.daysAway != null ? ` · ${nextMilestone.daysAway} days` : ""}
            </span>
          </div>
        </OverlaySection>
      ) : null}

      <OverlayFooter />
    </div>
  );
}
