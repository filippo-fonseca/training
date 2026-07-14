import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  DimensionalIcon,
  DumbbellGlyph,
  CalendarGlyph,
  FlameGlyph,
  TimerGlyph,
  TrophyGlyph,
  HeartGlyph,
} from "@/components/ui/icons";
import type { StatusTone } from "@/lib/design/tokens";
import { chipStyle } from "@/lib/design/tokens";
import type { SessionCategory, DaySession, SessionLog, DayAlternative } from "@/lib/db";
import type { JourneyView } from "./journey-model";
import { formatLongDate } from "./journey-time";

/** Category -> dimensional glyph. Accent cyan is never an icon body fill. */
function glyphFor(category: SessionCategory | null): ReactNode {
  switch (category) {
    case "race":
      return <TrophyGlyph />;
    case "quality_run":
      return <FlameGlyph />;
    case "long_run":
    case "easy_run":
      return <TimerGlyph />;
    case "bike":
      return <HeartGlyph />;
    case "strength_only":
      return <DumbbellGlyph />;
    default:
      return <CalendarGlyph />;
  }
}

const GATE_HUE: Record<DayAlternative["gate"], `--${string}`> = {
  green: "--ink-sage",
  yellow: "--ink-amber",
  red: "--ink-coral",
};

/** A mono-labelled target value, rendering "--" when empty (brief §2c). */
function Target({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="flex flex-col gap-1">
      <span className="sd-stat-label">{label}</span>
      <span
        className={
          "sd-numeral text-sm font-medium " + (empty ? "text-sd-ink-faint" : "text-sd-ink")
        }
      >
        {empty ? "--" : value}
      </span>
    </div>
  );
}

function km(n: number | null | undefined): string {
  if (n == null) return "--";
  return `${Number.isInteger(n) ? n : n.toFixed(1)} km`;
}

/** Status pill reflecting where today's session sits: verified (Strava evidence),
 *  logged, rest, or planned. Linked evidence wins over the manual log. */
function todayPill(
  session: JourneyView["session"],
  log: SessionLog | null,
  actual: JourneyView["todayActual"],
) {
  if (actual.source === "strava") return { tone: "done" as StatusTone, label: "Done, verified" };
  if (log) {
    if (log.completed && !log.modified) return { tone: "done" as StatusTone, label: "Logged" };
    if (log.completed && log.modified) return { tone: "active" as StatusTone, label: "Logged, adjusted" };
    return { tone: "warn" as StatusTone, label: "Modified" };
  }
  if (session.isRest) return { tone: "idle" as StatusTone, label: "Rest day" };
  return { tone: "progress" as StatusTone, label: "Planned" };
}

function SecondaryRow({ session }: { session: DaySession }) {
  return (
    <div className="flex items-start gap-3 rounded-sd-tile border border-sd-line bg-sd-dark-box p-3">
      <DimensionalIcon size={28}>
        {session.category === "bike" ? <HeartGlyph /> : <DumbbellGlyph />}
      </DimensionalIcon>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-sd-ink">
          <span className="sd-stat-label mr-2 align-middle">Also</span>
          {session.title}
        </span>
        {session.prescription_text ? (
          <span className="text-xs leading-relaxed text-sd-ink-dull">
            {session.prescription_text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TodayCard({ view }: { view: JourneyView }) {
  const { session, todayLog, todayISO, todayActual } = view;
  const { primary, secondary, alternatives, day } = session;

  // Empty state: no plan day maps to today (before the plan starts, or after it ends).
  if (!day || !primary) {
    return (
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="sd-stat-label">Today</span>
          <StatusPill tone="idle" label={view.started ? "Nothing scheduled" : "Not started"} />
        </div>
        <p className="text-sm text-sd-ink-dull">
          {view.started
            ? "No session is scheduled for today. Rest, recover, and let the next block come to you."
            : "The plan opens on the first training day. Check back when the build begins."}
        </p>
      </Panel>
    );
  }

  const pill = todayPill(session, todayLog, todayActual);
  const hasActual = todayActual.source !== "none";
  const verified = todayActual.source === "strava";

  return (
    <Panel className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DimensionalIcon size={34}>{glyphFor(primary.category)}</DimensionalIcon>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-baseline gap-2">
              <span className="sd-stat-label">Today</span>
              <span className="text-xs text-sd-ink-faint">{formatLongDate(todayISO)}</span>
            </div>
            <span className="truncate text-base font-semibold tracking-tight text-sd-ink">
              {primary.title}
            </span>
          </div>
        </div>
        <StatusPill tone={pill.tone} label={pill.label} />
      </div>

      {/* Role / why-today */}
      {primary.role ? (
        <p className="text-sm leading-relaxed text-sd-ink-dull">{primary.role}</p>
      ) : null}

      {/* Prescription */}
      {primary.prescription_text ? (
        <p className="rounded-sd-tile border border-sd-line bg-sd-dark-box p-3 text-sm leading-relaxed text-sd-ink">
          {primary.prescription_text}
        </p>
      ) : null}

      {/* Targets */}
      {!session.isRest ? (
        <div className="grid grid-cols-2 gap-4 border-t border-sd-line pt-4 sm:grid-cols-4">
          <Target label="Distance" value={km(primary.distance_km ?? day.planned_run_km)} />
          <Target label="Target pace" value={primary.pace_text} />
          <Target label="RPE" value={primary.rpe_text} />
          <Target label="Duration" value={primary.duration_text} />
        </div>
      ) : null}

      {primary.hr_text ? (
        <div className="flex flex-col gap-1">
          <span className="sd-stat-label">HR guide</span>
          <span className="text-xs text-sd-ink-dull">{primary.hr_text}</span>
        </div>
      ) : null}

      {/* Actual vs plan: once linked Strava evidence or a manual log exists.
          Evidence precedence: distance/duration are cumulative Strava totals. */}
      {hasActual ? (
        <div className="flex flex-col gap-3 rounded-sd-tile border border-sd-line bg-sd-dark-box p-4">
          <div className="flex items-center justify-between">
            <span className="sd-stat-label">{verified ? "Done (Strava)" : "Logged"}</span>
            {todayLog?.traffic_light ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: `var(${GATE_HUE[todayLog.traffic_light]})` }}
                />
                <span className="text-tiny capitalize text-sd-ink-dull">
                  {todayLog.traffic_light}
                </span>
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Target label="Actual distance" value={km(todayActual.distanceKm)} />
            <Target label="Actual pace" value={todayLog?.actual_pace_text} />
            <Target
              label="Actual RPE"
              value={todayLog?.actual_rpe != null ? `${todayLog.actual_rpe}/10` : undefined}
            />
          </div>
          {verified && todayActual.activityCount > 0 ? (
            <p className="text-tiny text-sd-ink-faint">
              Cumulative across{" "}
              {todayActual.activityCount === 1
                ? "the linked Strava activity"
                : `${todayActual.activityCount} linked Strava activities`}
              .
            </p>
          ) : null}
          {todayLog?.notes ? (
            <p className="text-xs leading-relaxed text-sd-ink-dull">{todayLog.notes}</p>
          ) : null}
        </div>
      ) : null}

      {/* Symptom-gated alternatives (green / yellow / red) */}
      {alternatives.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-sd-line pt-4">
          <span className="sd-stat-label">If symptoms flare</span>
          <div className="flex flex-col gap-2">
            {[...alternatives]
              .sort((a, b) => a.gate.localeCompare(b.gate))
              .map((alt) => (
                <div key={alt.id} className="flex items-start gap-2.5">
                  <span
                    className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5"
                    style={{ ...chipStyle(GATE_HUE[alt.gate]), color: "var(--sd-ink-dull)" }}
                  >
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ background: `var(${GATE_HUE[alt.gate]})` }}
                    />
                    <span className="text-tiny capitalize">{alt.gate}</span>
                  </span>
                  <span className="text-xs leading-relaxed text-sd-ink-dull">
                    {alt.prescription}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {/* Secondary training */}
      {secondary ? <SecondaryRow session={secondary} /> : null}
    </Panel>
  );
}
