/**
 * The journey view model. A pure derivation over a normalized data bundle, so
 * the live-Supabase path and the local fixture fall through the exact same
 * logic and render identically. Nothing here touches the network; the data
 * layer (data.ts) supplies the bundle from @/lib/db or the fixture.
 */
import type {
  Plan,
  PlanPhase,
  PlanWeek,
  PlanDay,
  DaySession,
  DayAlternative,
  Milestone,
  SessionLog,
  DayDetail,
} from "@/lib/db";
import {
  effectiveActual,
  phaseForWeek,
  assignWeeksToPhases,
  type ActivityEvidence,
  type EffectiveActual,
} from "@/lib/derive";
import { countdown, daysBetween, type Countdown } from "./journey-time";

/**
 * The public-safe subset of a `plans` row. This is the only shape of plan
 * data allowed to cross into the view model and, from there, the client
 * component boundary. It intentionally omits every private field on the row
 * (athlete_age, internal goal targets, etc.); the clinical narrative
 * (medical_notes, athlete_notes) is not even on the public plans row, living
 * only in the owner-only plan_private_notes table per decision D1. This keeps
 * only what the public journey page actually renders.
 */
export type PublicPlan = Pick<
  Plan,
  | "id"
  | "slug"
  | "title"
  | "status"
  | "race_name"
  | "race_distance_km"
  | "race_date"
  | "race_location"
  | "start_date"
  | "end_date"
  | "north_star"
>;

/** Project a fetched `plans` row down to the public-safe subset. Never spread
 * the raw row — list fields explicitly so a new column added to `plans`
 * (e.g. another clinical note) is private by default, not public by default. */
export function toPublicPlan(plan: Plan): PublicPlan {
  return {
    id: plan.id,
    slug: plan.slug,
    title: plan.title,
    status: plan.status,
    race_name: plan.race_name,
    race_distance_km: plan.race_distance_km,
    race_date: plan.race_date,
    race_location: plan.race_location,
    start_date: plan.start_date,
    end_date: plan.end_date,
    north_star: plan.north_star,
  };
}

/** Normalized inputs, gathered by the data layer for the day being viewed. */
export interface JourneyBundle {
  plan: PublicPlan;
  phases: PlanPhase[];
  weeks: PlanWeek[];
  milestones: Milestone[];
  /** The plan day for "today" with its sessions + gated alternatives, if any. */
  todayDetail: DayDetail | null;
  /** Every day of the week that contains "today" (for the weekly snapshot). */
  weekDays: PlanDay[];
  /** Session logs indexed by plan_day_id (public read; may be empty). */
  logsByDayId: Record<string, SessionLog>;
  /** Linked Strava evidence indexed by plan_day_id (public-safe projection).
   *  Optional so fixtures and older callers need no change; empty = no links. */
  evidenceByDayId?: Record<string, ActivityEvidence[]>;
  /** Whether this bundle came from the live database or the local fixture. */
  source: "live" | "fixture";
}

export interface RaceInfo {
  name: string;
  distanceKm: number | null;
  date: string | null;
  location: string | null;
  countdown: Countdown;
}

export interface TodaySession {
  day: PlanDay | null;
  primary: DaySession | null;
  secondary: DaySession | null;
  alternatives: DayAlternative[];
  /** True on planned zero-distance / rest-category days. */
  isRest: boolean;
}

export interface WeekSnapshot {
  plannedKm: number;
  loggedKm: number;
  /** Planned distance for week days up to and including today. */
  plannedToDateKm: number;
  rangeMin: number | null;
  rangeMax: number | null;
  hasLogs: boolean;
}

export interface NextMilestone {
  milestone: Milestone;
  /** Calendar days away, or null for a week-anchored milestone with no date. */
  daysAway: number | null;
  effectiveDate: string | null;
}

export interface JourneyView {
  source: "live" | "fixture";
  todayISO: string;
  plan: PublicPlan;
  race: RaceInfo;
  started: boolean;
  weekIndex: number;
  totalWeeks: number;
  currentWeek: PlanWeek | null;
  currentPhase: PlanPhase | null;
  phaseLabel: string;
  /** 1-based position of the current week within its phase. */
  phaseWeek: number;
  phaseWeekCount: number;
  phaseProgress: number;
  planProgress: number;
  session: TodaySession;
  todayLog: SessionLog | null;
  /** Linked Strava activities for today (evidence; empty when none). */
  todayEvidence: ActivityEvidence[];
  /** Today's resolved actual after evidence precedence (lib/derive). */
  todayActual: EffectiveActual;
  week: WeekSnapshot;
  nextMilestone: NextMilestone | null;
}

function clamp(n: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, n));
}

/** The plan week that contains `todayISO`, clamped to the first/last week. */
export function findCurrentWeek(
  weeks: PlanWeek[],
  todayISO: string,
): PlanWeek | null {
  const sorted = [...weeks].sort((a, b) => a.week_index - b.week_index);
  if (sorted.length === 0) return null;
  for (const w of sorted) {
    if (w.start_date && w.end_date && todayISO >= w.start_date && todayISO <= w.end_date) {
      return w;
    }
  }
  const first = sorted[0];
  if (first.start_date && todayISO < first.start_date) return first;
  return sorted[sorted.length - 1];
}

/** Resolve a milestone's anchor date: its own date, or its week's start. */
function milestoneDate(m: Milestone, weeks: PlanWeek[]): string | null {
  if (m.date) return m.date;
  if (m.week_number != null) {
    const w = weeks.find((x) => x.week_index === m.week_number);
    if (w?.start_date) return w.start_date;
  }
  return null;
}

export function computeView(bundle: JourneyBundle, todayISO: string): JourneyView {
  const { plan, phases, weeks, milestones, todayDetail, weekDays, logsByDayId } = bundle;
  const evidenceByDayId = bundle.evidenceByDayId ?? {};

  const race: RaceInfo = {
    name: plan.race_name ?? plan.title,
    distanceKm: plan.race_distance_km,
    date: plan.race_date,
    location: plan.race_location,
    countdown: countdown(todayISO, plan.race_date ?? todayISO),
  };

  const totalWeeks = weeks.length;
  const currentWeek = findCurrentWeek(weeks, todayISO);
  const weekIndex = currentWeek?.week_index ?? 1;
  const started = !!(plan.start_date && todayISO >= plan.start_date);

  // Phase containing the current week, by date containment (the shared
  // membership rule in lib/derive). The current week's start_date decides which
  // phase owns it; the phase's own week span is the set of weeks that match it.
  const currentPhase = currentWeek ? phaseForWeek(phases, currentWeek) : null;
  const phaseLabel = currentPhase?.name ?? currentWeek?.phase_label ?? "";
  const phaseWeeks = currentPhase
    ? assignWeeksToPhases(phases, weeks).byPhaseId.get(currentPhase.id) ?? []
    : [];
  const phaseWeekCount = Math.max(1, phaseWeeks.length);
  const posInPhase =
    currentWeek != null ? phaseWeeks.findIndex((w) => w.id === currentWeek.id) : -1;
  const phaseWeek = clamp(posInPhase >= 0 ? posInPhase + 1 : 1, 1, phaseWeekCount);

  // Progress: how far today sits into the current phase and the whole plan.
  const intoWeek = currentWeek?.start_date
    ? clamp(daysBetween(currentWeek.start_date, todayISO), 0, 6)
    : 0;
  const dayFrac = (intoWeek + 1) / 7; // count today as a day in progress
  const phaseProgress = clamp((phaseWeek - 1 + dayFrac) / phaseWeekCount);

  let planProgress = 0;
  if (plan.start_date && plan.end_date) {
    const totalDays = daysBetween(plan.start_date, plan.end_date) + 1;
    const elapsed = daysBetween(plan.start_date, todayISO) + 1;
    planProgress = clamp(elapsed / totalDays);
  }

  // Today's session split into primary / secondary slots.
  const sessions = todayDetail?.sessions ?? [];
  const primary = sessions.find((s) => s.slot === "primary") ?? null;
  const secondary = sessions.find((s) => s.slot === "secondary") ?? null;
  const plannedKmToday = todayDetail?.day.planned_run_km ?? 0;
  const isRest =
    !!todayDetail &&
    (primary?.category === "rest" ||
      (plannedKmToday === 0 && primary?.category !== "bike" && primary?.category !== "strength_only"));
  const session: TodaySession = {
    day: todayDetail?.day ?? null,
    primary,
    secondary,
    alternatives: todayDetail?.alternatives ?? [],
    isRest,
  };

  const todayLog = todayDetail ? logsByDayId[todayDetail.day.id] ?? null : null;
  const todayEvidence = todayDetail ? evidenceByDayId[todayDetail.day.id] ?? [] : [];
  const todayActual = effectiveActual(todayEvidence, todayLog);

  // Weekly km snapshot: planned ceiling vs the effective actuals so far (linked
  // Strava evidence per day wins; the manual log is the fallback, per lib/derive).
  let loggedKm = 0;
  let plannedToDateKm = 0;
  let hasLogs = false;
  for (const d of weekDays) {
    if (d.date <= todayISO) plannedToDateKm += d.planned_run_km ?? 0;
    const actual = effectiveActual(evidenceByDayId[d.id] ?? [], logsByDayId[d.id] ?? null);
    if (actual.distanceKm != null) {
      loggedKm += actual.distanceKm;
      hasLogs = true;
    }
  }
  const week: WeekSnapshot = {
    plannedKm: currentWeek?.planned_km ?? 0,
    loggedKm,
    plannedToDateKm,
    rangeMin: currentWeek?.range_min_km ?? null,
    rangeMax: currentWeek?.range_max_km ?? null,
    hasLogs,
  };

  // Next upcoming milestone by resolved anchor date (own date or its week start).
  const upcoming = milestones
    .map((m) => ({ milestone: m, effectiveDate: milestoneDate(m, weeks) }))
    .filter((x) => x.effectiveDate != null && x.effectiveDate >= todayISO)
    .sort((a, b) => (a.effectiveDate! < b.effectiveDate! ? -1 : 1));
  const nextMilestone: NextMilestone | null = upcoming.length
    ? {
        milestone: upcoming[0].milestone,
        effectiveDate: upcoming[0].effectiveDate,
        daysAway: upcoming[0].milestone.date
          ? daysBetween(todayISO, upcoming[0].milestone.date)
          : null,
      }
    : null;

  return {
    source: bundle.source,
    todayISO,
    plan,
    race,
    started,
    weekIndex,
    totalWeeks,
    currentWeek,
    currentPhase,
    phaseLabel,
    phaseWeek,
    phaseWeekCount,
    phaseProgress,
    planProgress,
    session,
    todayLog,
    todayEvidence,
    todayActual,
    week,
    nextMilestone,
  };
}
