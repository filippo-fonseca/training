import type { JourneyView } from "@/components/journey/journey-model";
import { SessionDetail } from "@/components/calendar/session-detail";
import { Alternatives } from "@/components/calendar/alternatives";
import { LoggedVsPlan } from "@/components/calendar/logged-vs-plan";
import { SessionEvidence } from "@/components/calendar/session-evidence";
import { OverlayHeader, OverlayFooter, overlayTitleId } from "./overlay-chrome";
import { formatLongDate } from "@/components/journey/journey-time";

/**
 * The Today expand: the full day detail, reusing the calendar day components.
 * Evidence gating mirrors the day page exactly (decision D2): an off-plan run
 * shows as verified OFF-PLAN evidence, never as a completed planned session.
 */
export function TodayOverlay({ view }: { view: JourneyView }) {
  const { session, todayLog, todayEvidence, todayActual } = view;
  const onPlan = todayActual.source === "strava";
  const offPlan = todayEvidence.length > 0 && !onPlan;
  const day = session.day;

  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow={day ? `${day.weekday ?? ""} · ${formatLongDate(day.date)}` : "Today"}
        title="Today's session"
        titleId={overlayTitleId("today")}
      />

      {session.primary ? (
        <SessionDetail
          session={session.primary}
          slot="primary"
          alternatives={
            session.alternatives.length > 0 ? (
              <Alternatives alternatives={session.alternatives} />
            ) : undefined
          }
        />
      ) : (
        <p className="rounded-sd-card border border-sd-line bg-sd-box/40 px-5 py-8 text-center text-sm text-sd-ink-faint">
          Nothing planned for today.
        </p>
      )}

      {session.secondary ? (
        <SessionDetail session={session.secondary} slot="secondary" />
      ) : null}

      {(todayLog || (todayEvidence.length > 0 && !offPlan)) ? (
        <LoggedVsPlan
          log={todayLog}
          primary={session.primary}
          plannedKm={day?.planned_run_km ?? null}
          evidence={offPlan ? [] : todayEvidence}
        />
      ) : null}

      {todayEvidence.length > 0 ? (
        <SessionEvidence evidence={todayEvidence} offPlan={offPlan} />
      ) : null}

      <OverlayFooter />
    </div>
  );
}
