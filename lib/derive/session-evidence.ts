/**
 * Session-evidence derivation: the single source of truth for turning linked
 * Strava activities into a session's completion status and cumulative actuals.
 * Pure functions over plain data so every surface (day page, calendar, progress,
 * public APIs) derives identically and the logic is unit-testable in isolation.
 *
 * Rules (owner's spec):
 *   1. A session with >= 1 linked activity is DONE.
 *   2. Its ACTUAL distance / time is the CUMULATIVE total across linked
 *      activities, never manually entered.
 *   3. Linked evidence takes precedence over a manual session_log; the log is
 *      the fallback used only when no activities are linked.
 *   4. Publicly, only curated activity fields (title, photo, distance, time,
 *      strava id) are exposed; see ActivityEvidence, which never carries the
 *      raw API payload.
 */

import type {
  SessionActivityLink,
  SessionLog,
  StravaActivity,
} from '@/lib/types/database';

/** Base URL for a public Strava activity page. */
const STRAVA_ACTIVITY_BASE = 'https://www.strava.com/activities';

/** The public, outbound URL for a Strava activity ("proof that I did it"). */
export function stravaActivityUrl(stravaId: number): string {
  return `${STRAVA_ACTIVITY_BASE}/${stravaId}`;
}

/**
 * The public-safe evidence projection of one linked activity. This is the ONLY
 * shape allowed to cross onto a public surface: it hand-picks curated fields and
 * never includes the raw Strava payload, tokens, HR, or map data. Adding a new
 * private column to strava_activities cannot leak here because fields are listed
 * explicitly (same discipline as toPublicPlan, sealed decision D1).
 */
export interface ActivityEvidence {
  stravaId: number;
  name: string | null;
  photoUrl: string | null;
  distanceM: number | null;
  movingTimeS: number | null;
  elapsedTimeS: number | null;
  startDate: string | null;
  sportType: string | null;
  /** Outbound link to the activity on strava.com. */
  activityUrl: string;
}

/** Project a raw activity row to the public-safe evidence subset. Never spread
 *  the row: list fields explicitly so private columns stay private by default. */
export function toActivityEvidence(a: StravaActivity): ActivityEvidence {
  return {
    stravaId: a.strava_id,
    name: a.name,
    photoUrl: a.photo_url,
    distanceM: a.distance_m,
    movingTimeS: a.moving_time_s,
    elapsedTimeS: a.elapsed_time_s,
    startDate: a.start_date,
    sportType: a.sport_type,
    activityUrl: stravaActivityUrl(a.strava_id),
  };
}

/** Cumulative totals across a set of linked activities. */
export interface CumulativeEvidence {
  count: number;
  /** Sum of distances, in km, or null when no activity reports a distance. */
  distanceKm: number | null;
  /** Sum of moving times, in seconds, or null when none report it. */
  movingTimeS: number | null;
  /** Sum of elapsed times, in seconds, or null when none report it. */
  elapsedTimeS: number | null;
}

/**
 * Sum distance and time across linked activities (rule 2). A metric stays null
 * until at least one activity reports it, so a missing value reads as "unknown",
 * not zero. Meters are converted to km at the end to avoid rounding drift.
 */
export function cumulativeEvidence(activities: ActivityEvidence[]): CumulativeEvidence {
  let distanceM = 0;
  let movingTimeS = 0;
  let elapsedTimeS = 0;
  let anyDistance = false;
  let anyMoving = false;
  let anyElapsed = false;

  for (const a of activities) {
    if (a.distanceM != null) {
      distanceM += a.distanceM;
      anyDistance = true;
    }
    if (a.movingTimeS != null) {
      movingTimeS += a.movingTimeS;
      anyMoving = true;
    }
    if (a.elapsedTimeS != null) {
      elapsedTimeS += a.elapsedTimeS;
      anyElapsed = true;
    }
  }

  return {
    count: activities.length,
    distanceKm: anyDistance ? round1(distanceM / 1000) : null,
    movingTimeS: anyMoving ? Math.round(movingTimeS) : null,
    elapsedTimeS: anyElapsed ? Math.round(elapsedTimeS) : null,
  };
}

export type EvidenceSource = 'strava' | 'log' | 'none';

/** The resolved actual for a session, after applying evidence precedence. */
export interface EffectiveActual {
  /** Where the numbers came from: linked activities, the manual log, or nothing. */
  source: EvidenceSource;
  /** Whether the session counts as completed/done. */
  done: boolean;
  distanceKm: number | null;
  durationMin: number | null;
  /** Number of linked activities (0 when the source is the log or none). */
  activityCount: number;
}

/**
 * Resolve a session's effective actual with precedence (rules 1 + 3): when >= 1
 * activity is linked, the cumulative Strava totals win and the session is DONE;
 * otherwise fall back to the manual session_log (done iff it is completed); with
 * neither, the session is not done and has no actuals.
 */
export function effectiveActual(
  activities: ActivityEvidence[],
  log: SessionLog | null,
): EffectiveActual {
  if (activities.length > 0) {
    const cum = cumulativeEvidence(activities);
    return {
      source: 'strava',
      done: true,
      distanceKm: cum.distanceKm,
      durationMin: cum.movingTimeS != null ? round1(cum.movingTimeS / 60) : null,
      activityCount: cum.count,
    };
  }
  if (log) {
    return {
      source: 'log',
      done: log.completed,
      distanceKm: log.actual_distance_km,
      durationMin: log.actual_duration_min,
      activityCount: 0,
    };
  }
  return { source: 'none', done: false, distanceKm: null, durationMin: null, activityCount: 0 };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// -----------------------------------------------------------------------------
// On-plan vs off-plan taxonomy.
//
// A linked run "completes" a planned session only when the day actually planned
// something a run can satisfy. Per the sealed cron spec, a runnable session is
// any category that is neither rest nor a strength-only session; rest and
// strength days are OFF-PLAN targets, so a run on one logs volume for the day
// but never marks that session done (decision D2). The auto-linker uses the same
// taxonomy to choose whether to attach a run to a session (on-plan) or to the
// day itself (off-plan).
// -----------------------------------------------------------------------------

/** Categories a linked run can NEVER complete (rest / strength-type). */
const NON_RUNNABLE_CATEGORIES = new Set<string>(['rest', 'strength_only']);

/** True when a session's category is one a linked run completes (on-plan). */
export function isRunnableSessionCategory(category: string | null | undefined): boolean {
  return category != null && !NON_RUNNABLE_CATEGORIES.has(category);
}

/** True when a day has at least one runnable (on-plan) session. */
export function dayHasRunnableSession(
  categories: Array<string | null | undefined>,
): boolean {
  return categories.some(isRunnableSessionCategory);
}

// -----------------------------------------------------------------------------
// Grouping helpers: fold links + activities into evidence keyed by session or
// by plan day, so each surface builds its evidence map through one code path.
// Pure: callers supply already-fetched rows. Ordered by activity start_date
// (earliest first) so a track day's activities read chronologically.
// -----------------------------------------------------------------------------

/** Index activity rows by their row id, projected to public-safe evidence. */
export function evidenceById(activities: StravaActivity[]): Map<string, ActivityEvidence> {
  const map = new Map<string, ActivityEvidence>();
  for (const a of activities) map.set(a.id, toActivityEvidence(a));
  return map;
}

function sortByStart(a: ActivityEvidence, b: ActivityEvidence): number {
  if (a.startDate == null) return 1;
  if (b.startDate == null) return -1;
  return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0;
}

/** Group linked evidence by day_session_id. Day-level (off-plan) links carry a
 *  null day_session_id and are skipped here: they belong to the day, not a
 *  session, so a session picker never surfaces them. */
export function groupEvidenceBySession(
  links: SessionActivityLink[],
  activitiesById: Map<string, ActivityEvidence>,
): Map<string, ActivityEvidence[]> {
  const bySession = new Map<string, ActivityEvidence[]>();
  for (const link of links) {
    if (!link.day_session_id) continue;
    const ev = activitiesById.get(link.strava_activity_id);
    if (!ev) continue;
    const list = bySession.get(link.day_session_id) ?? [];
    list.push(ev);
    bySession.set(link.day_session_id, list);
  }
  for (const list of bySession.values()) list.sort(sortByStart);
  return bySession;
}

/**
 * A plan day's linked evidence: every activity attached to the day (session-
 * level plus day-level / off-plan), plus whether ANY of them completes a planned
 * session. `onPlan` is true when at least one link names a session
 * (day_session_id set); a day with only day-level links is off-plan.
 */
export interface DayEvidence {
  /** Every linked activity for the day, earliest first (volume + display). */
  activities: ActivityEvidence[];
  /** True when >= 1 link is session-level: the day completes a planned session.
   *  False when the day carries only off-plan (day-level) links. */
  onPlan: boolean;
}

/**
 * Group linked evidence by plan_day_id, aggregating across every session of the
 * day AND any day-level (off-plan) links. Each link names its plan day directly
 * (plan_day_id, since 0009); `sessionDay` is a legacy fallback for a link that
 * somehow lacks it. An activity linked more than once to the same day (unusual)
 * is de-duplicated by strava id so cumulative totals never double-count. The
 * returned `onPlan` flag lets a surface count a completed session without
 * treating an off-plan run as completing a strength/rest day (decision D2).
 */
export function groupEvidenceByDay(
  links: SessionActivityLink[],
  activitiesById: Map<string, ActivityEvidence>,
  sessionDay: Map<string, string> = new Map(),
): Map<string, DayEvidence> {
  const seen = new Map<string, Set<number>>();
  const byDay = new Map<string, DayEvidence>();
  for (const link of links) {
    const planDayId =
      link.plan_day_id ??
      (link.day_session_id ? sessionDay.get(link.day_session_id) : undefined);
    if (!planDayId) continue;
    const ev = activitiesById.get(link.strava_activity_id);
    if (!ev) continue;
    const entry = byDay.get(planDayId) ?? { activities: [], onPlan: false };
    // A session-level link completes the planned session; track that regardless
    // of whether this activity is a new one for the day.
    if (link.day_session_id) entry.onPlan = true;
    const seenIds = seen.get(planDayId) ?? new Set<number>();
    if (!seenIds.has(ev.stravaId)) {
      seenIds.add(ev.stravaId);
      seen.set(planDayId, seenIds);
      entry.activities.push(ev);
    }
    byDay.set(planDayId, entry);
  }
  for (const entry of byDay.values()) entry.activities.sort(sortByStart);
  return byDay;
}
