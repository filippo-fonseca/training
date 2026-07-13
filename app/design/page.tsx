import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { StatBlock } from "@/components/ui/stat-block";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BoldAmbient } from "@/components/ui/bold-ambient";
import {
  DimensionalIcon,
  DumbbellGlyph,
  CalendarGlyph,
  FlameGlyph,
  TimerGlyph,
  TrophyGlyph,
  HeartGlyph,
} from "@/components/ui/icons";
import { staggerStyle } from "@/lib/design/motion";
import type { StatusTone } from "@/lib/design/tokens";

export const metadata: Metadata = {
  title: "Design system · Training Tracker",
  description: "Living reference for the spacedrivey design system.",
};

/* --- token catalogs, read straight off the CSS custom properties --- */

const LADDER: Array<[string, string]> = [
  ["--sd-app", "canvas / page bg"],
  ["--sd-box", "cards, panels, pills"],
  ["--sd-dark-box", "recessed surfaces"],
  ["--sd-darker-box", "deepest recess"],
  ["--sd-input", "inputs, progress track"],
  ["--sd-line", "the hairline (1px)"],
  ["--sd-hover", "row / tile hover"],
  ["--sd-selected", "active / selected fill"],
  ["--sd-active", "pressed state"],
  ["--sd-sidebar", "sidebar (darkest)"],
];

const INK: Array<[string, string]> = [
  ["--sd-ink", "headings, values"],
  ["--sd-ink-dull", "body, labels"],
  ["--sd-ink-faint", "captions, idle"],
];

const ACCENT: Array<[string, string]> = [
  ["--sd-accent", "THE accent"],
  ["--sd-accent-faint", "hover / bright"],
  ["--sd-accent-deep", "pressed / deep"],
];

const SEMANTIC: Array<[string, string]> = [
  ["--ink-sage", "active / done"],
  ["--ink-amber", "warning / pending"],
  ["--ink-coral", "danger / missed"],
  ["--ink-violet", "category tint"],
  ["--ink-blue", "category tint"],
];

const RADII: Array<[string, string]> = [
  ["--sd-radius-chrome", "6 · chrome"],
  ["--sd-radius-tile", "8 · tiles"],
  ["--sd-radius-card", "12 · cards"],
  ["--sd-radius-full", "full · pills"],
];

const TONES: StatusTone[] = [
  "active",
  "progress",
  "synced",
  "pending",
  "warn",
  "danger",
  "idle",
  "done",
];

/* --- small local layout helpers --- */

function Section({
  title,
  index,
  description,
  children,
}: {
  title: string;
  index: number;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="sd-enter flex flex-col gap-4" style={staggerStyle(index)}>
      <div className="flex flex-col gap-1">
        <span className="sd-stat-label">{`0${index + 1}`.slice(-2)}</span>
        <h2 className="text-lg font-semibold tracking-tight text-sd-ink">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-sd-ink-dull">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  token,
  use,
  ring,
}: {
  token: string;
  use: string;
  ring?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-16 w-full rounded-sd-tile"
        style={{
          background: `var(${token})`,
          border: ring ? "1px solid var(--sd-line)" : "1px solid transparent",
          boxShadow: "var(--sd-bevel)",
        }}
      />
      <div className="flex flex-col">
        <code className="sd-numeral text-xs text-sd-ink">{token}</code>
        <span className="text-xs text-sd-ink-faint">{use}</span>
      </div>
    </div>
  );
}

function Dot({ token, use }: { token: string; use: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: `var(${token})` }}
      />
      <code className="sd-numeral text-xs text-sd-ink">{token}</code>
      <span className="text-xs text-sd-ink-faint">{use}</span>
    </div>
  );
}

export default function DesignReference() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <BoldAmbient focal />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-14 px-6 py-16">
        {/* Header */}
        <header
          className="sd-enter flex flex-col gap-3"
          style={staggerStyle(0)}
        >
          <span className="sd-stat-label">Living reference</span>
          <h1 className="sd-punch text-4xl font-bold tracking-tight text-sd-ink">
            Spacedrivey design system
          </h1>
          <p className="max-w-2xl text-pretty text-sd-ink-dull">
            Every token and primitive rendered from{" "}
            <code className="sd-numeral text-sd-ink">docs/DESIGN-BRIEF.md</code>.
            This route is the acceptance harness: if a primitive drifts from the
            brief, it shows here first.
          </p>
        </header>

        {/* Surface ladder */}
        <Section
          index={1}
          title="Surface ladder"
          description="The hue-235 grey ladder. Elevation is a step up the ladder plus a 1px hairline and a white inset top bevel, never a heavy shadow."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {LADDER.map(([token, use]) => (
              <Swatch key={token} token={token} use={use} ring />
            ))}
          </div>
        </Section>

        {/* Ink + accent */}
        <Section
          index={2}
          title="Ink & accent"
          description="Body copy is dull, headings are bright. One accent hue owns the app: JARVIS cyan, oklch(72% 0.13 210)."
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="sd-stat-label">Ink tiers</span>
              <div className="flex flex-col gap-3">
                {INK.map(([token, use]) => (
                  <div key={token} className="flex items-center justify-between">
                    <span style={{ color: `var(${token})` }} className="text-base">
                      The quick brown fox
                    </span>
                    <div className="flex flex-col items-end">
                      <code className="sd-numeral text-xs text-sd-ink">
                        {token}
                      </code>
                      <span className="text-xs text-sd-ink-faint">{use}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <span className="sd-stat-label">Accent</span>
              <div className="grid grid-cols-3 gap-4">
                {ACCENT.map(([token, use]) => (
                  <Swatch key={token} token={token} use={use} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Functional hues */}
        <Section
          index={3}
          title="Functional hues"
          description="Greens, ambers, reds exist ONLY as 6px status dots and 15%-alpha chips. Never as chrome, borders, or button fills."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              {SEMANTIC.map(([token, use]) => (
                <Dot key={token} token={token} use={use} />
              ))}
            </div>
            <div className="flex flex-wrap content-start gap-2">
              {(
                [
                  ["--ink-sage", "Active"],
                  ["--ink-amber", "Pending"],
                  ["--ink-coral", "Missed"],
                  ["--ink-violet", "Tempo"],
                  ["--ink-blue", "Long"],
                ] as Array<[`--${string}`, string]>
              ).map(([hue, label]) => (
                <span
                  key={hue}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-tiny"
                  style={{
                    background: `color-mix(in srgb, var(${hue}) 15%, var(--sd-box))`,
                    borderColor: `color-mix(in srgb, var(${hue}) 30%, var(--sd-line))`,
                    color: "var(--sd-ink-dull)",
                    fontSize: "10.4px",
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: `var(${hue})` }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* Radius scale */}
        <Section
          index={4}
          title="Radius scale"
          description="Strict scale (D7): 6 chrome, 8 tiles, 12 cards, full pills. Nothing above 12px except deliberate floating surfaces."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {RADII.map(([token, use]) => (
              <div key={token} className="flex flex-col gap-2">
                <div
                  className="h-16 w-full border border-sd-line bg-sd-box"
                  style={{ borderRadius: `var(${token})`, boxShadow: "var(--sd-bevel)" }}
                />
                <span className="text-xs text-sd-ink-faint">{use}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section
          index={5}
          title="Typography"
          description="Inter for all chrome; JetBrains Mono as the selective signature: 10px uppercase tracked labels over bold numerals."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["Volume", "112", "km this block"],
                ["Sessions", "5 / 6", "week 3"],
                ["Long run", "24", "km on sunday"],
              ] as Array<[string, string, string]>
            ).map(([label, value, caption]) => (
              <Panel key={label}>
                <StatBlock label={label} value={value} caption={caption} />
              </Panel>
            ))}
          </div>
        </Section>

        {/* Dimensional icons */}
        <Section
          index={6}
          title="Dimensional icons"
          description="Gradient indigo backplates with a token-driven drop shadow and a monochrome glyph. Accent cyan is never an icon body fill."
        >
          <div className="flex flex-wrap gap-4">
            {[
              <DumbbellGlyph key="d" />,
              <CalendarGlyph key="c" />,
              <FlameGlyph key="f" />,
              <TimerGlyph key="t" />,
              <TrophyGlyph key="tr" />,
              <HeartGlyph key="h" />,
            ].map((g, i) => (
              <DimensionalIcon key={i}>{g}</DimensionalIcon>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section
          index={7}
          title="Buttons"
          description="Pill-shaped, uppercase tracked labels. Primary is lit from above; press dips 1px; no hover-scale."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Log session</Button>
            <Button variant="ghost">Sync now</Button>
            <Button variant="quiet">Edit plan</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </Section>

        {/* Status pills */}
        <Section
          index={8}
          title="Status pills"
          description="A 6px colored dot plus a dull mono-adjacent label on --sd-box chrome. The hue lives only in the dot."
        >
          <div className="flex flex-wrap gap-2.5">
            {TONES.map((tone) => (
              <StatusPill key={tone} tone={tone} />
            ))}
          </div>
        </Section>

        {/* Progress */}
        <Section
          index={9}
          title="Progress"
          description="Accent fill on a 6px track. The projected segment renders as a 45-degree accent hatch for planned-but-not-done ranges."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Panel>
              <ProgressBar
                label="Block volume"
                valueLabel="82 / 112 km"
                value={73}
              />
            </Panel>
            <Panel>
              <ProgressBar
                label="Taper (projected)"
                valueLabel="3 / 5 sessions"
                value={60}
                projected={40}
              />
            </Panel>
          </div>
        </Section>

        {/* Entity card */}
        <Section
          index={10}
          title="Entity card"
          description="The workhorse: dimensional icon + medium ink title + dull subtitle + right-aligned status pill, over a progress row."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Panel interactive>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <DimensionalIcon>
                    <DumbbellGlyph />
                  </DimensionalIcon>
                  <div className="flex flex-col">
                    <span className="font-medium text-sd-ink">
                      Threshold intervals
                    </span>
                    <span className="text-sm text-sd-ink-dull">
                      6 x 1 km @ 3:45/km
                    </span>
                  </div>
                </div>
                <StatusPill tone="progress" />
              </div>
              <div className="mt-4">
                <ProgressBar label="Completed" valueLabel="4 / 6 reps" value={66} />
              </div>
            </Panel>
            <Panel interactive>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <DimensionalIcon>
                    <CalendarGlyph />
                  </DimensionalIcon>
                  <div className="flex flex-col">
                    <span className="font-medium text-sd-ink">Rest day</span>
                    <span className="text-sm text-sd-ink-dull">
                      Mobility, optional walk
                    </span>
                  </div>
                </div>
                <StatusPill tone="idle" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Recovery", "Sleep 8h", "Hydrate"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-md border border-sd-line bg-sd-box px-2 py-1 text-tiny text-sd-ink-dull"
                    style={{ fontSize: "10.4px" }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </Panel>
          </div>
        </Section>

        <footer
          className="sd-enter border-t border-sd-line pt-6 text-xs text-sd-ink-faint"
          style={staggerStyle(11)}
        >
          Training Tracker · spacedrivey · dark-only this session. Sealed
          authority: docs/DESIGN-BRIEF.md.
        </footer>
      </div>
    </main>
  );
}
