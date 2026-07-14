import { BoldAmbient } from "@/components/ui/bold-ambient";
import { ProgressBar } from "@/components/ui/progress-bar";
import { chipStyle } from "@/lib/design/tokens";
import { staggerStyle } from "@/lib/design/motion";
import type { JourneyView } from "./journey-model";
import { formatLongDate } from "./journey-time";

/** A short comeback verb for the headline, chosen from the current phase. */
function phaseVerb(view: JourneyView): string {
  const label = view.phaseLabel.toLowerCase();
  if (view.currentWeek?.is_race_week || label.includes("race week")) return "Race week";
  if (view.currentWeek?.is_taper || label.includes("taper")) return "Tapering";
  if (label.includes("return")) return "Rebuilding";
  if (label.includes("peak")) return "Peaking";
  if (label.includes("specificity") || label.includes("half-marathon development")) return "Getting specific";
  if (label.includes("threshold")) return "Finding the edge";
  if (label.includes("cutback")) return "Absorbing the work";
  if (label.includes("durability")) return "Building the base";
  return "Building";
}

/** The countdown numeral text, with race-day and post-race handling. */
function countdownDisplay(view: JourneyView): { value: string; label: string } {
  const { status, days } = view.race.countdown;
  if (status === "today") return { value: "0", label: "Race day" };
  if (status === "past") return { value: "0", label: "Race complete" };
  return { value: String(days), label: days === 1 ? "Day to race" : "Days to race" };
}

export function JourneyHero({ view }: { view: JourneyView }) {
  const { race, weekIndex, totalWeeks, phaseLabel, phaseWeek, phaseWeekCount, phaseProgress } = view;
  const cd = countdownDisplay(view);
  const raceMeta = [
    race.date ? formatLongDate(race.date) : null,
    race.location,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="relative isolate overflow-hidden rounded-sd-card">
      {/* The one bold-ambient moment: focal orb + drifting glow behind the hero */}
      <BoldAmbient focal />

      <div className="relative z-10 flex flex-col gap-8 px-6 py-14 sm:px-10 sm:py-16">
        {/* Eyebrow + framing */}
        <div className="flex flex-col gap-4">
          <div
            className="sd-enter-hero flex flex-wrap items-center gap-2.5"
            style={staggerStyle(0)}
          >
            <span className="sd-stat-label">The comeback</span>
            {race.distanceKm != null ? (
              <span
                className="inline-flex items-center rounded-md border px-2 py-0.5 text-tiny"
                style={{ ...chipStyle("--sd-accent"), color: "var(--sd-accent-faint)" }}
              >
                {race.name} · {race.distanceKm} km
              </span>
            ) : null}
          </div>

          <h1
            className="sd-enter-hero sd-punch max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-sd-ink sm:text-6xl"
            style={staggerStyle(1)}
          >
            Week {weekIndex} of {totalWeeks}. {phaseVerb(view)}.
          </h1>

          {view.plan.north_star ? (
            <p
              className="sd-enter-hero max-w-2xl text-pretty text-base leading-relaxed text-sd-ink-dull sm:text-lg"
              style={staggerStyle(2)}
            >
              {view.plan.north_star}
            </p>
          ) : null}
        </div>

        {/* Focal stat strip — no card chrome, sits over the glow */}
        <div
          className="sd-enter-hero flex flex-wrap items-end gap-x-12 gap-y-6"
          style={staggerStyle(3)}
        >
          <div className="relative flex flex-col gap-1.5">
            {/* Soft cyan glow anchored behind the hero's key number. This is a
                diffuse gradient wash, not a second glossy orb, so it stays
                within the one-orb-per-page cap. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -left-8 -top-10 -z-10 h-40 w-40 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, var(--hud-cyan-glow) 0%, transparent 70%)",
                filter: "blur(14px)",
              }}
            />
            <span className="sd-stat-label">{cd.label}</span>
            <span className="sd-numeral sd-punch text-6xl font-bold leading-none tracking-tight text-sd-ink sm:text-7xl">
              {cd.value}
            </span>
            {raceMeta ? (
              <span className="text-xs text-sd-ink-dull">{raceMeta}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="sd-stat-label">Current week</span>
            <span className="sd-numeral text-4xl font-bold leading-none tracking-tight text-sd-ink sm:text-5xl">
              {weekIndex}
              <span className="text-2xl text-sd-ink-faint"> / {totalWeeks}</span>
            </span>
            <span className="text-xs text-sd-ink-dull">{phaseLabel}</span>
          </div>
        </div>

        {/* Phase progress */}
        <div className="sd-enter-hero max-w-xl" style={staggerStyle(4)}>
          <ProgressBar
            label={`${phaseLabel} · week ${phaseWeek} of ${phaseWeekCount}`}
            valueLabel={`${Math.round(phaseProgress * 100)}%`}
            value={phaseProgress * 100}
          />
        </div>
      </div>
    </section>
  );
}
