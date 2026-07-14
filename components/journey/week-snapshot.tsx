import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";
import type { JourneyView } from "./journey-model";

function fmtKm(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Weekly km snapshot: what has been logged so far against the week's planned
 * ceiling. The solid bar is logged distance; the hatched segment is the planned
 * remainder (planned is a ceiling and a range, never a floor to chase).
 */
export function WeekSnapshot({ view }: { view: JourneyView }) {
  const { week, phaseLabel } = view;
  const planned = week.plannedKm || 0;
  const loggedPct = planned > 0 ? (week.loggedKm / planned) * 100 : 0;
  const remainingPct = planned > 0 ? Math.max(0, ((planned - week.loggedKm) / planned) * 100) : 0;

  const rangeLabel =
    week.rangeMin != null && week.rangeMax != null
      ? `${fmtKm(week.rangeMin)}-${fmtKm(week.rangeMax)} km range`
      : "planned ceiling";

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="sd-stat-label">This week</span>
          <span className="text-base font-semibold tracking-tight text-sd-ink">
            Weekly volume
          </span>
        </div>
        <StatusPill
          tone={week.hasLogs ? "progress" : "idle"}
          label={week.hasLogs ? "In progress" : "Not logged"}
        />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="sd-numeral text-3xl font-bold leading-none tracking-tight text-sd-ink">
          {fmtKm(week.loggedKm)}
        </span>
        <span className="sd-numeral text-lg text-sd-ink-faint">/ {fmtKm(planned)} km</span>
      </div>

      <ProgressBar
        label="Logged so far"
        valueLabel={rangeLabel}
        value={loggedPct}
        projected={remainingPct}
      />

      <p className="text-xs text-sd-ink-dull">
        {week.hasLogs
          ? `${fmtKm(week.loggedKm)} km logged of a ${fmtKm(planned)} km plan in ${phaseLabel.toLowerCase()}. Planned ${fmtKm(week.plannedToDateKm)} km through today.`
          : `Week planned at ${fmtKm(planned)} km. ${fmtKm(week.plannedToDateKm)} km scheduled through today; nothing logged yet.`}
      </p>
    </Panel>
  );
}
