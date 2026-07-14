import type { StatsPageData } from "@/app/(public)/stats/_data";
import { TrainingHeatmap } from "@/components/stats/heatmap";
import { StatBlock } from "@/components/ui/stat-block";
import { OverlayHeader, OverlayFooter, OverlaySection, overlayTitleId } from "./overlay-chrome";

/** The Heatmap / stat-tile expand: the full contributions heatmap + stat blocks. */
export function HeatmapOverlay({ stats }: { stats: StatsPageData }) {
  const s = stats.summary;
  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow={`${stats.heatmap.length} days`}
        title="Training heatmap"
        titleId={overlayTitleId("heatmap")}
        subtitle="Every planned day, filling in as the work gets logged. Intensity tracks logged volume; today is ringed."
      />

      <section className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <StatBlock
          label="Completed"
          value={s.anyLogged ? `${s.totalCompletedKm}` : undefined}
          caption={`of ${s.totalPlannedKm} km`}
        />
        <StatBlock
          label="Sessions"
          value={`${s.sessionsCompleted} / ${s.sessionsPlanned}`}
          caption={s.anyLogged ? `${Math.round(s.completionRate * 100)}% done` : "logged"}
        />
        <StatBlock
          label="Streak"
          value={`${s.currentStreak}`}
          caption={`longest ${s.longestStreak}`}
        />
        <StatBlock
          label="Weeks"
          value={`${s.weeksCompleted} / ${s.totalWeeks}`}
          caption="complete"
        />
      </section>

      <OverlaySection>
        <div className="overflow-x-auto rounded-sd-card border border-sd-line bg-sd-box/40 p-4">
          <TrainingHeatmap
            cells={stats.heatmap}
            today={stats.today}
            maxDayVolumeKm={s.maxDayVolumeKm}
          />
        </div>
      </OverlaySection>

      <OverlayFooter />
    </div>
  );
}
