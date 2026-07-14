/**
 * Maps the internal `JourneyView` (built for the hyperpolymath journey page)
 * down to the public widget JSON contracts. Every field here is deliberately
 * hand-picked, never spread, so a new private field added to the view model
 * later is excluded by default rather than leaked by default (same discipline
 * as `toPublicPlan`, sealed decision D1). Health data (health_entries,
 * symptom-gated alternatives, Strava tokens) never enters this file.
 */
import type { DaySession, PlanDay, SessionLog, TrafficLight } from "@/lib/db";
import type { JourneyView } from "@/components/journey/journey-model";

export type PublicStatus = "rest" | "planned" | "logged" | "missed";

export interface PublicSessionTargets {
  pace: string | null;
  rpe: string | null;
  hr: string | null;
}

export interface PublicSession {
  slot: DaySession["slot"];
  title: string;
  type: DaySession["category"];
  distance_km: number | null;
  duration: string | null;
  targets: PublicSessionTargets;
}

export interface PublicLoggedSummary {
  distance_km: number | null;
  duration_min: number | null;
  pace: string | null;
  status: TrafficLight | null;
}

export interface PublicRace {
  name: string;
  distance_km: number | null;
  date: string | null;
  location: string | null;
}

export interface PublicTodayResponse {
  date: string;
  race: PublicRace;
  phase: string;
  week: number;
  countdown_days: number;
  sessions: PublicSession[];
  status: PublicStatus;
  logged: PublicLoggedSummary | null;
}

export interface PublicStatusResponse {
  date: string;
  status: PublicStatus;
  session_title: string | null;
  distance_km: number | null;
  countdown_days: number;
}

/**
 * Derived from the same signals the journey page's status pill uses (see
 * `today-card.tsx`), collapsed to the four public states. No plan day
 * scheduled, or an explicit rest day, both read as "rest"; a log with
 * `completed: false` reads as "missed" rather than "logged".
 */
export function deriveStatus(view: JourneyView): PublicStatus {
  const { session, todayLog } = view;
  if (!session.day || session.isRest) return "rest";
  if (todayLog) return todayLog.completed ? "logged" : "missed";
  return "planned";
}

function toPublicSession(session: DaySession, day: PlanDay): PublicSession {
  return {
    slot: session.slot,
    title: session.title,
    type: session.category,
    distance_km: session.distance_km ?? (session.slot === "primary" ? day.planned_run_km : null),
    duration: session.duration_text,
    targets: {
      pace: session.pace_text,
      rpe: session.rpe_text,
      hr: session.hr_text,
    },
  };
}

function toLoggedSummary(log: SessionLog): PublicLoggedSummary {
  return {
    distance_km: log.actual_distance_km,
    duration_min: log.actual_duration_min,
    pace: log.actual_pace_text,
    status: log.traffic_light,
  };
}

export function buildTodayPayload(view: JourneyView): PublicTodayResponse {
  const { session, todayLog, race } = view;
  const sessions = session.day
    ? [session.primary, session.secondary]
        .filter((s): s is DaySession => s != null)
        .map((s) => toPublicSession(s, session.day as PlanDay))
    : [];

  return {
    date: view.todayISO,
    race: {
      name: race.name,
      distance_km: race.distanceKm,
      date: race.date,
      location: race.location,
    },
    phase: view.phaseLabel,
    week: view.weekIndex,
    countdown_days: race.countdown.days,
    sessions,
    status: deriveStatus(view),
    logged: todayLog ? toLoggedSummary(todayLog) : null,
  };
}

export function buildStatusPayload(view: JourneyView): PublicStatusResponse {
  const { session } = view;
  return {
    date: view.todayISO,
    status: deriveStatus(view),
    session_title: session.primary?.title ?? null,
    distance_km: session.primary?.distance_km ?? session.day?.planned_run_km ?? null,
    countdown_days: view.race.countdown.days,
  };
}
