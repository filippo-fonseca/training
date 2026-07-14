import type { Metadata } from "next";
import { PageShell, NavItem } from "@/components/ui/page-shell";
import { BoldAmbient } from "@/components/ui/bold-ambient";
import { StatBlock } from "@/components/ui/stat-block";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  DimensionalIcon,
  CalendarGlyph,
  FlameGlyph,
  TimerGlyph,
  TrophyGlyph,
  ChartGlyph,
} from "@/components/ui/icons";
import { staggerStyle } from "@/lib/design/motion";
import { TrainingHeatmap } from "@/components/stats/heatmap";
import { TypeBreakdownList } from "@/components/stats/type-breakdown";
import { loadStats } from "./_data";

export const metadata: Metadata = {
  title: "Stats · Training Tracker",
  description:
    "The whole Baystate 2026 build in numbers: planned vs completed volume, sessions, streaks, and a contributions-style training heatmap.",
};

// Data is read per-request via the anon client (or the seed fixture fallback).
export const dynamic = "force-dynamic";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Minutes to a compact "12.5 h" label (whole hours drop the decimal). */
function hours(minutes: number): string {
  const h = Math.round(minutes / 6) / 10;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
}

/** "Oct 18" style short label for a 'YYYY-MM-DD' race date. */
function shortRace(iso: string | null): string {
  if (!iso) return "race day";
  const [, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}

export default async function StatsPage() {
  const { plan, summary, heatmap, today, fromFixture } = await loadStats();

  const {
    totalPlannedKm,
    totalCompletedKm,
    sessionsPlanned,
    sessionsCompleted,
    completionRate,
    plannedMinutes,
    actualMinutes,
    hasActualTime,
    currentStreak,
    longestStreak,
    daysUntilRace,
    weeksCompleted,
    totalWeeks,
    byType,
    maxDayVolumeKm,
    anyLogged,
  } = summary;

  return (
    <PageShell
      nav={
        <>
          <NavItem href="/" icon={<FlameGlyph />}>
            Overview
          </NavItem>
          <NavItem href="/milestones" icon={<CalendarGlyph />}>
            Milestones
          </NavItem>
          <NavItem href="/progress" icon={<TimerGlyph />}>
            Progress
          </NavItem>
          <NavItem href="/stats" icon={<ChartGlyph />} active>
            Stats
          </NavItem>
        </>
      }
      topbar={
        <div className="flex items-center gap-2">
          <span className="sd-stat-label">Stats</span>
          <span className="text-sm text-sd-ink-dull">
            {plan.race_name} · {plan.race_distance_km} km
          </span>
        </div>
      }
    >
      <div className="relative">
        {/* Bold ambient + one focal orb behind the stat strip */}
        <BoldAmbient focal className="-z-0" />

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-12">
          {/* Header */}
          <header className="sd-enter flex flex-col gap-2" style={staggerStyle(0)}>
            <span className="sd-stat-label">The whole build, in numbers</span>
            <h1 className="sd-punch text-3xl font-bold tracking-tight text-sd-ink sm:text-4xl">
              Stats
            </h1>
            <p className="max-w-xl text-pretty text-sd-ink-dull">
              Every planned kilometre, session, and week across the 14-week plan,
              with a day-by-day heatmap that fills in as the work gets logged.
            </p>
          </header>

          {/* Stat strip: no card chrome, over the glow */}
          <section
            className="sd-enter grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6"
            style={staggerStyle(1)}
            aria-label="Plan summary"
          >
            <StatBlock
              icon={
                <DimensionalIcon>
                  <TrophyGlyph />
                </DimensionalIcon>
              }
              label="Days to race"
              value={daysUntilRace > 0 ? daysUntilRace : "0"}
              caption={`until ${plan.race_name ?? "race"} · ${shortRace(plan.race_date)}`}
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <FlameGlyph />
                </DimensionalIcon>
              }
              label="Completed"
              value={anyLogged ? `${totalCompletedKm}` : undefined}
              caption={`of ${totalPlannedKm} km planned`}
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <ChartGlyph />
                </DimensionalIcon>
              }
              label="Sessions"
              value={`${sessionsCompleted} / ${sessionsPlanned}`}
              caption={anyLogged ? `${pct(completionRate)} complete` : "logged so far"}
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <FlameGlyph />
                </DimensionalIcon>
              }
              label="Streak"
              value={`${currentStreak}`}
              caption={`longest ${longestStreak} day${longestStreak === 1 ? "" : "s"}`}
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <CalendarGlyph />
                </DimensionalIcon>
              }
              label="Weeks"
              value={`${weeksCompleted} / ${totalWeeks}`}
              caption="weeks complete"
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <TimerGlyph />
                </DimensionalIcon>
              }
              label="Time"
              value={hasActualTime ? hours(actualMinutes) : undefined}
              caption={`of ~${hours(plannedMinutes)} planned`}
            />
          </section>

          {/* Heatmap */}
          <section className="sd-enter" style={staggerStyle(2)}>
            <Panel padded className="p-5 sm:p-6">
              <TrainingHeatmap
                cells={heatmap}
                today={today}
                maxDayVolumeKm={maxDayVolumeKm}
              />
            </Panel>
          </section>

          {/* Planned volume by session type */}
          <section className="sd-enter" style={staggerStyle(3)}>
            <Panel padded className="p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="sd-stat-label">Planned volume by type</span>
                  <span className="text-sm text-sd-ink-dull">
                    How the {totalPlannedKm} planned km break down across the plan.
                  </span>
                </div>
                <TypeBreakdownList items={byType} />
              </div>
            </Panel>
          </section>

          {/* Empty-state note + provenance */}
          <footer
            className="sd-enter flex flex-wrap items-center justify-between gap-3 border-t border-sd-line pt-6"
            style={staggerStyle(4)}
          >
            <p className="max-w-xl text-xs text-sd-ink-faint">
              {anyLogged
                ? "Completed figures reflect logged sessions; every cell links to its day."
                : "No sessions logged yet. The plan is entirely ahead: the heatmap and completed totals fill in from here as the build gets underway."}
            </p>
            <StatusPill
              tone={fromFixture ? "idle" : "synced"}
              label={fromFixture ? "Seed data" : "Live"}
            />
          </footer>
        </div>
      </div>
    </PageShell>
  );
}
