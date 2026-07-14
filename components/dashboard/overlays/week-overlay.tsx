import type { ProgressData } from "@/app/(public)/progress/_data";
import { WeeklyKmChart, CumulativeKmChart } from "@/components/charts";
import { OverlayHeader, OverlayFooter, OverlaySection, overlayTitleId } from "./overlay-chrome";

/** The Week-volume expand: weekly planned-vs-logged bars + the cumulative line. */
export function WeekOverlay({ progress }: { progress: ProgressData }) {
  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow="Weekly volume"
        title="Volume and progress"
        titleId={overlayTitleId("week")}
        subtitle="Planned volume is a ceiling, not a floor. Logged km fill in from the accent baseline; un-run weeks show as a hatched projection."
      />

      <OverlaySection>
        <div className="overflow-x-auto rounded-sd-card border border-sd-line bg-sd-box/40 p-4">
          <WeeklyKmChart
            weekly={progress.weekly}
            phases={progress.phases}
            currentWeek={progress.currentWeek}
          />
        </div>
      </OverlaySection>

      <OverlaySection>
        <div className="overflow-x-auto rounded-sd-card border border-sd-line bg-sd-box/40 p-4">
          <CumulativeKmChart
            points={progress.cumulative}
            totalPlannedKm={progress.summary.totalPlannedKm}
          />
        </div>
      </OverlaySection>

      <OverlayFooter />
    </div>
  );
}
