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
  TrophyGlyph,
  TimerGlyph,
} from "@/components/ui/icons";
import { staggerStyle } from "@/lib/design/motion";
import { WeeklyKmChart, CumulativeKmChart } from "@/components/charts";
import { loadProgress } from "./_data";

export const metadata: Metadata = {
  title: "Progress · Training Tracker",
  description:
    "Weekly planned-vs-actual volume, cumulative kilometres, and plan completion for the Baystate 2026 build.",
};

// Data is read per-request via the anon client (or the seed fixture fallback).
export const dynamic = "force-dynamic";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default async function ProgressPage() {
  const { plan, weekly, cumulative, phases, summary, currentWeek, fromFixture } =
    await loadProgress();

  const anyLogged = weekly.some((w) => w.actualKm != null);
  const totalPlanned = summary.totalPlannedKm;

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
          <NavItem href="/progress" icon={<TimerGlyph />} active>
            Progress
          </NavItem>
        </>
      }
      topbar={
        <div className="flex items-center gap-2">
          <span className="sd-stat-label">Progress</span>
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
            <span className="sd-stat-label">The build, in numbers</span>
            <h1 className="sd-punch text-3xl font-bold tracking-tight text-sd-ink sm:text-4xl">
              Progress
            </h1>
            <p className="max-w-xl text-pretty text-sd-ink-dull">
              Planned volume is a ceiling, not a floor to chase. Actual km fill in
              as sessions are logged; unrun weeks show as a hatched projection.
            </p>
          </header>

          {/* Completion-rate stat strip — no card chrome, over the glow */}
          <section
            className="sd-enter grid grid-cols-2 gap-6 sm:grid-cols-4"
            style={staggerStyle(1)}
            aria-label="Plan completion summary"
          >
            <StatBlock
              icon={
                <DimensionalIcon>
                  <FlameGlyph />
                </DimensionalIcon>
              }
              label="Completed"
              value={anyLogged ? `${summary.totalActualKm}` : undefined}
              caption={`of ${totalPlanned} km planned`}
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <TimerGlyph />
                </DimensionalIcon>
              }
              label="On plan"
              value={
                summary.plannedToDateKm > 0 && anyLogged
                  ? pct(summary.onPlanRate)
                  : undefined
              }
              caption={`vs ${summary.plannedToDateKm} km due so far`}
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <CalendarGlyph />
                </DimensionalIcon>
              }
              label="Week"
              value={currentWeek ? `${currentWeek} / ${summary.totalWeeks}` : `0 / ${summary.totalWeeks}`}
              caption={currentWeek ? "current block" : "not started"}
            />
            <StatBlock
              icon={
                <DimensionalIcon>
                  <TrophyGlyph />
                </DimensionalIcon>
              }
              label="Plan total"
              value={`${totalPlanned}`}
              caption="km to the finish"
            />
          </section>

          {/* Weekly km chart */}
          <section className="sd-enter" style={staggerStyle(2)}>
            <Panel padded className="p-5 sm:p-6">
              <WeeklyKmChart weekly={weekly} phases={phases} currentWeek={currentWeek} />
            </Panel>
          </section>

          {/* Cumulative chart */}
          <section className="sd-enter" style={staggerStyle(3)}>
            <Panel padded className="p-5 sm:p-6">
              <CumulativeKmChart points={cumulative} totalPlannedKm={totalPlanned} />
            </Panel>
          </section>

          {/* Empty-state note + provenance */}
          <footer
            className="sd-enter flex flex-wrap items-center justify-between gap-3 border-t border-sd-line pt-6"
            style={staggerStyle(4)}
          >
            <p className="max-w-xl text-xs text-sd-ink-faint">
              {anyLogged
                ? "Actual km reflect logged sessions; weeks past the last log stay as planned projections."
                : "No sessions logged yet — every bar is a planned projection. Actual km will fill in from the accent baseline as the build gets underway."}
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
