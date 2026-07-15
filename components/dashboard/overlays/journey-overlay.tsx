import type { JourneyView } from "@/components/journey/journey-model";
import type { ProgressData } from "@/app/(public)/progress/_data";
import { daysBetween } from "@/components/journey/journey-time";
import { cn } from "@/lib/design/cn";
import { OverlayFooter, OverlaySection, overlayTitleId } from "./overlay-chrome";

/** The GitHub mark, inline so it inherits currentColor and needs no asset. */
function GitHubMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const CHIP_CLASS =
  "sd-press inline-flex items-center gap-1.5 rounded-full border border-sd-line bg-sd-darker-box px-2.5 py-1 font-mono text-tiny tracking-wide text-sd-ink-dull transition-colors hover:border-sd-selected hover:text-sd-ink";

/** The three-paragraph mission, verbatim per the sealed brief. */
const MISSION = [
  "Hi! I'm Filippo, a mechatronics engineer and researcher studying at Yale. Last year an injury stopped my running completely. This is the rebuild, in public.",
  "Fourteen weeks, planned down to the day, from a careful return to running to the Baystate Half Marathon in Lowell on October 18, 2026. Every session is prescribed in advance and verified against Strava. The good days and the bad ones both count.",
  "I built this tracker to keep myself honest, and it is open source. If you are working your way back from an injury of your own, I hope it helps. Say hi!",
];

/**
 * The Countdown / next-milestone expand: THE MISSION. A personal header (avatar,
 * wordmark, link chips), the first-person mission text, a compact position strip
 * (day / week / phase), and the phase rail of the whole plan with the current
 * week highlighted (phase membership by date containment, migration 0008).
 */
export function JourneyOverlay({
  view,
  progress,
}: {
  view: JourneyView;
  progress: ProgressData;
}) {
  const { plan, weekIndex, totalWeeks, phaseLabel, nextMilestone, todayISO } = view;

  // Day-of-plan, derived from data already on the view (no new query/prop). The
  // plan runs start_date .. end_date inclusive; clamp so pre-start / post-race
  // reads stay in [1, total].
  const totalDays =
    plan.start_date && plan.end_date
      ? daysBetween(plan.start_date, plan.end_date) + 1
      : totalWeeks * 7;
  const dayOfPlan = plan.start_date
    ? Math.min(Math.max(daysBetween(plan.start_date, todayISO) + 1, 1), totalDays)
    : 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4 pr-10">
        <img
          src="/filippo-avatar.png"
          alt="Filippo Fonseca"
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-full object-cover ring-1 ring-sd-line"
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col">
            <h2
              id={overlayTitleId("journey")}
              className="font-sans text-2xl font-bold leading-none tracking-tight text-sd-ink"
            >
              THE MISSION
            </h2>
            <span className="sd-stat-label mt-1">By Filippo Fonseca</span>
            <span className="sd-stat-label mt-0.5">President @ Yale Robotics</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://filippofonseca.com"
              target="_blank"
              rel="noopener noreferrer"
              className={CHIP_CLASS}
            >
              filippofonseca.com
            </a>
            <a
              href="https://github.com/filippo-fonseca/training"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(CHIP_CLASS, "gap-1.5")}
              aria-label="GitHub repository"
            >
              <GitHubMark />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <div className="flex max-w-prose flex-col gap-3 font-mono text-sm leading-relaxed text-sd-ink-dull">
        {MISSION.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCell label="Day" value={dayOfPlan} of={totalDays} />
        <StatCell label="Week" value={weekIndex} of={totalWeeks} />
        <div className="flex flex-col justify-center gap-1 rounded-sd-tile border border-sd-line bg-sd-box/40 px-3 py-2.5">
          <span className="sd-stat-label">Phase</span>
          <span className="truncate font-sans text-sm font-semibold text-sd-ink">
            {phaseLabel || "In progress"}
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

/** A compact position cell: mono small-caps label over a Grotesk numeral pair. */
function StatCell({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <div className="flex flex-col justify-center gap-1 rounded-sd-tile border border-sd-line bg-sd-box/40 px-3 py-2.5">
      <span className="sd-stat-label">{label}</span>
      <span className="font-sans text-sd-ink">
        <span className="text-xl font-bold tracking-tight">{value}</span>
        <span className="sd-numeral text-tiny text-sd-ink-faint"> of {of}</span>
      </span>
    </div>
  );
}
