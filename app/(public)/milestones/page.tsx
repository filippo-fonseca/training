import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageShell, NavItem } from "@/components/ui/page-shell";
import { BoldAmbient } from "@/components/ui/bold-ambient";
import { StatusPill } from "@/components/ui/status-pill";
import {
  DimensionalIcon,
  CalendarGlyph,
  FlameGlyph,
  TimerGlyph,
  TrophyGlyph,
} from "@/components/ui/icons";
import { staggerStyle } from "@/lib/design/motion";
import { cn } from "@/lib/design/cn";
import { loadMilestones, type TimelineEntry } from "./_data";

export const metadata: Metadata = {
  title: "Milestones · Training Tracker",
  description:
    "The Baystate 2026 journey: decision checkpoints, gated long runs, key workouts, taper, and race day.",
};

export const dynamic = "force-dynamic";

/** Node dot color reads status: past dimmed, today accent, future faint outline. */
function nodeStyle(status: TimelineEntry["status"], isRace: boolean) {
  if (isRace) {
    return {
      background: "var(--sd-accent)",
      boxShadow: "0 0 0 4px var(--sd-app), 0 0 16px var(--hud-cyan-glow)",
    };
  }
  if (status === "current") {
    return {
      background: "var(--sd-accent)",
      boxShadow: "0 0 0 3px var(--sd-app), 0 0 10px var(--hud-cyan-glow)",
    };
  }
  if (status === "passed") {
    return { background: "var(--sd-ink-faint)", boxShadow: "0 0 0 3px var(--sd-app)" };
  }
  // upcoming: hollow, expectant
  return {
    background: "var(--sd-box)",
    boxShadow: "0 0 0 3px var(--sd-app)",
    border: "1.5px solid var(--sd-line)",
  };
}

const TRAFFIC: Array<{ key: "green" | "yellow" | "red"; label: string; hue: string }> = [
  { key: "green", label: "Green", hue: "--ink-sage" },
  { key: "yellow", label: "Yellow", hue: "--ink-amber" },
  { key: "red", label: "Red", hue: "--ink-coral" },
];

/** Traffic-light rows: a 6px dot per gate + its action. Never full-saturation fills. */
function TrafficLights({ entry }: { entry: TimelineEntry }) {
  const rows = TRAFFIC.map((t) => ({ ...t, text: entry[t.key] })).filter((r) => r.text);
  if (rows.length === 0) return null;
  return (
    <dl className="mt-3 flex flex-col gap-1.5 border-t border-sd-line pt-3">
      {rows.map((r) => (
        <div key={r.key} className="flex items-start gap-2">
          <dt className="mt-[5px] flex shrink-0 items-center">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: `var(${r.hue})` }}
            />
            <span className="sr-only">{r.label}:</span>
          </dt>
          <dd className="text-xs leading-relaxed text-sd-ink-dull">{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function iconFor(entry: TimelineEntry): ReactNode {
  if (entry.isRace) return <TrophyGlyph />;
  if (entry.kind === "checkpoint" || entry.milestoneType === "decision_checkpoint")
    return <CalendarGlyph />;
  if (entry.milestoneType === "key_workout") return <TimerGlyph />;
  return <FlameGlyph />;
}

function kindLabel(entry: TimelineEntry): string {
  if (entry.kind === "checkpoint") return "Decision checkpoint";
  switch (entry.milestoneType) {
    case "cutback_week":
      return "Cutback week";
    case "gated_long_run":
      return "Gated long run";
    case "key_workout":
      return "Key workout";
    case "taper_start":
      return "Taper start";
    case "race":
      return "Race day";
    case "post_race":
      return "Post-race";
    default:
      return "Milestone";
  }
}

function TimelineRow({ entry, index }: { entry: TimelineEntry; index: number }) {
  const dimmed = entry.status === "passed";
  return (
    <li
      className="sd-enter relative flex gap-4 pl-1"
      style={staggerStyle(index)}
      aria-current={entry.status === "current" ? "step" : undefined}
    >
      {/* Node dot on the spine */}
      <div className="relative flex w-4 shrink-0 justify-center">
        <span
          className={cn("mt-1.5 rounded-full", entry.isRace ? "size-4" : "size-3")}
          style={nodeStyle(entry.status, entry.isRace)}
        />
      </div>

      {/* Card */}
      <div
        className={cn(
          "mb-6 min-w-0 flex-1 rounded-sd-card border p-4 transition-opacity",
          entry.isRace
            ? "border-sd-line bg-sd-box"
            : "border-sd-line bg-sd-dark-box",
          dimmed && "opacity-70",
        )}
        style={{
          boxShadow: entry.isRace
            ? "var(--sd-bevel), 0 0 28px var(--hud-cyan-glow-soft)"
            : "var(--sd-bevel)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <DimensionalIcon size={entry.isRace ? 34 : 30}>{iconFor(entry)}</DimensionalIcon>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="sd-stat-label">{kindLabel(entry)}</span>
              <h3
                className={cn(
                  "text-pretty font-medium leading-tight text-sd-ink",
                  entry.isRace && "text-lg font-semibold",
                )}
              >
                {entry.title}
              </h3>
              <span className="sd-numeral text-xs text-sd-ink-faint">
                {entry.dateLabel}
                {entry.weekNumber ? ` · Week ${entry.weekNumber}` : ""}
              </span>
            </div>
          </div>
          <StatusPill
            tone={
              entry.status === "passed"
                ? "done"
                : entry.status === "current"
                  ? "progress"
                  : "idle"
            }
            label={
              entry.isRace
                ? "The finish"
                : entry.status === "passed"
                  ? "Passed"
                  : entry.status === "current"
                    ? "Today"
                    : "Upcoming"
            }
          />
        </div>

        {entry.description ? (
          <p className="mt-2 text-pretty text-sm leading-relaxed text-sd-ink-dull">
            {entry.description}
          </p>
        ) : null}

        <TrafficLights entry={entry} />
      </div>
    </li>
  );
}

export default async function MilestonesPage() {
  const { plan, entries, fromFixture } = await loadMilestones();

  const passed = entries.filter((e) => e.status === "passed").length;
  const total = entries.length;

  return (
    <PageShell
      nav={
        <>
          <NavItem href="/" icon={<FlameGlyph />}>
            Overview
          </NavItem>
          <NavItem href="/milestones" icon={<CalendarGlyph />} active>
            Milestones
          </NavItem>
          <NavItem href="/progress" icon={<TimerGlyph />}>
            Progress
          </NavItem>
        </>
      }
      topbar={
        <div className="flex items-center gap-2">
          <span className="sd-stat-label">Milestones</span>
          <span className="text-sm text-sd-ink-dull">
            {plan.race_name} · {plan.race_distance_km} km
          </span>
        </div>
      }
    >
      <div className="relative">
        <BoldAmbient whisper className="-z-0" />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-10">
          {/* Header */}
          <header className="sd-enter flex flex-col gap-2" style={staggerStyle(0)}>
            <span className="sd-stat-label">The journey · 14 weeks to the line</span>
            <h1 className="sd-punch text-3xl font-bold tracking-tight text-sd-ink sm:text-4xl">
              Milestones
            </h1>
            <p className="max-w-xl text-pretty text-sd-ink-dull">
              Every decision checkpoint, gated long run, key workout, and the
              taper, leading to {plan.race_name?.toLowerCase()} on{" "}
              {plan.race_date}. Green, amber, and coral gates govern each step.
            </p>
            <div className="mt-1 flex items-center gap-2">
              <StatusPill tone="idle" label={`${passed} / ${total} passed`} />
              <StatusPill tone={fromFixture ? "idle" : "synced"} label={fromFixture ? "Seed data" : "Live"} />
            </div>
          </header>

          {/* Timeline: a continuous spine rail behind the node column */}
          <div className="relative">
            <span
              aria-hidden
              className="absolute bottom-6 left-[10px] top-2 w-px"
              style={{
                background:
                  "linear-gradient(to bottom, var(--sd-line), var(--sd-line) 70%, color-mix(in srgb, var(--sd-accent) 40%, var(--sd-line)))",
              }}
            />
            <ol className="relative flex flex-col">
              {entries.map((entry, i) => (
                <TimelineRow key={entry.key} entry={entry} index={i + 1} />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
