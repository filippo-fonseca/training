// Progress aggregation helpers. Additive to the data-access layer: these read
// typed rows via lib/db and compute weekly planned-vs-actual km, cumulative km,
// and plan completion rate in pure TypeScript — no inline SQL, no chart library.
//
// "Planned" km is the week's ceiling (plan_weeks.planned_km, falling back to the
// sum of plan_days.planned_run_km). "Actual" km is the sum of logged
// session_logs.actual_distance_km for the days in that week. Because the plan
// begins 2026-07-13 and logs accrue over time, early weeks legitimately have no
// actual data; the shapes below make that empty/partial state explicit (actual
// stays null until at least one day in the week is logged) so the charts can
// render a clean "not yet run" projection rather than a misleading zero.

import type { TypedSupabaseClient } from './client';
import type { PlanWeek, PlanDay, SessionLog } from '../types/database';
import {
  getWeeks,
  getDays,
  getLogsForPlan,
  getStravaActivities,
  getActivityLinksForPlan,
} from './queries';
import {
  effectiveActual,
  evidenceById,
  groupEvidenceByDay,
  type DayEvidence,
} from '../derive';

/** Linked Strava evidence per plan_day_id. Empty map = no links (log fallback).
 *  Each entry carries the day's activities plus an on-plan flag so an off-plan
 *  run logs volume without completing a strength/rest session (decision D2). */
export type EvidenceByDay = Map<string, DayEvidence>;

const NO_EVIDENCE: EvidenceByDay = new Map();

/** One week's planned ceiling and (optional) logged actual, plus phase context. */
export interface WeeklyKm {
  weekIndex: number;
  startDate: string | null;
  endDate: string | null;
  phaseLabel: string | null;
  plannedKm: number;
  /** Sum of logged actual km for the week, or null when nothing is logged yet. */
  actualKm: number | null;
  /** Count of plan days in the week that carry a session log. */
  loggedDays: number;
  isCutback: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  isPeak: boolean;
}

/** A cumulative point after a given week: running planned and actual totals. */
export interface CumulativePoint {
  weekIndex: number;
  endDate: string | null;
  cumulativePlannedKm: number;
  /** Running actual total; null until the first logged week (stays flat after). */
  cumulativeActualKm: number | null;
}

/** Plan-wide completion figures for the stat strip. */
export interface ProgressSummary {
  totalPlannedKm: number;
  totalActualKm: number;
  /** actual / planned, 0..1, over the weeks that have elapsed (see plannedToDateKm). */
  completionRate: number;
  /** Planned km summed only over weeks whose window has started (<= today). */
  plannedToDateKm: number;
  /** completion vs. plannedToDate — the honest "keeping up?" number, 0..1. */
  onPlanRate: number;
  loggedSessions: number;
  totalSessions: number;
  weeksElapsed: number;
  totalWeeks: number;
}

/** Sum of planned_run_km across a set of days (a plan_weeks fallback). */
function sumPlannedDays(days: PlanDay[]): number {
  return round1(days.reduce((acc, d) => acc + (d.planned_run_km ?? 0), 0));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Pure reducer: fold weeks + days + logs into per-week planned/actual km. Exposed
 * (not just the async reader) so pages can compute from a static fixture too.
 */
export function computeWeeklyKm(
  weeks: PlanWeek[],
  days: PlanDay[],
  logs: SessionLog[],
  evidenceByDay: EvidenceByDay = NO_EVIDENCE,
): WeeklyKm[] {
  const daysByWeek = new Map<string, PlanDay[]>();
  for (const day of days) {
    const list = daysByWeek.get(day.week_id) ?? [];
    list.push(day);
    daysByWeek.set(day.week_id, list);
  }
  const logByDay = new Map<string, SessionLog>();
  for (const log of logs) logByDay.set(log.plan_day_id, log);

  // Effective actual km per day: linked Strava evidence takes precedence over the
  // manual log (lib/derive). A day counts as "logged" when either exists. Off-plan
  // (day-level) evidence still contributes its km volume here; the on-plan flag
  // only gates session COMPLETION, not logged volume (decision D2).
  const actualByDay = new Map<string, number>();
  const loggedDayIds = new Set<string>();
  for (const day of days) {
    const log = logByDay.get(day.id) ?? null;
    const evidence = evidenceByDay.get(day.id)?.activities ?? [];
    if (!log && evidence.length === 0) continue;
    loggedDayIds.add(day.id);
    const actual = effectiveActual(evidence, log);
    if (actual.distanceKm != null) actualByDay.set(day.id, actual.distanceKm);
  }

  return [...weeks]
    .sort((a, b) => a.week_index - b.week_index)
    .map((week) => {
      const weekDays = daysByWeek.get(week.id) ?? [];
      const planned =
        week.planned_km != null ? week.planned_km : sumPlannedDays(weekDays);

      let loggedDays = 0;
      let actualSum = 0;
      let anyLogged = false;
      for (const day of weekDays) {
        if (loggedDayIds.has(day.id)) {
          loggedDays += 1;
          anyLogged = true;
        }
        const km = actualByDay.get(day.id);
        if (km != null) actualSum += km;
      }

      return {
        weekIndex: week.week_index,
        startDate: week.start_date,
        endDate: week.end_date,
        phaseLabel: week.phase_label,
        plannedKm: round1(planned),
        actualKm: anyLogged ? round1(actualSum) : null,
        loggedDays,
        isCutback: week.is_cutback,
        isTaper: week.is_taper,
        isRaceWeek: week.is_race_week,
        isPeak: week.is_peak,
      };
    });
}

/** Pure reducer: running planned/actual totals across the weekly series. */
export function computeCumulative(weekly: WeeklyKm[]): CumulativePoint[] {
  let planned = 0;
  let actual = 0;
  let started = false;
  return weekly.map((w) => {
    planned = round1(planned + w.plannedKm);
    if (w.actualKm != null) {
      started = true;
      actual = round1(actual + w.actualKm);
    }
    return {
      weekIndex: w.weekIndex,
      endDate: w.endDate,
      cumulativePlannedKm: planned,
      cumulativeActualKm: started ? actual : null,
    };
  });
}

/**
 * Pure reducer: plan-wide completion figures. `today` lets callers pin "now" for
 * deterministic rendering (defaults to the current date). A week counts as
 * elapsed once its start date is on or before today.
 */
export function computeProgressSummary(
  weekly: WeeklyKm[],
  logs: SessionLog[],
  days: PlanDay[],
  today: Date = new Date(),
  evidenceByDay: EvidenceByDay = NO_EVIDENCE,
): ProgressSummary {
  const todayIso = today.toISOString().slice(0, 10);

  let totalPlanned = 0;
  let totalActual = 0;
  let plannedToDate = 0;
  let weeksElapsed = 0;
  for (const w of weekly) {
    totalPlanned = round1(totalPlanned + w.plannedKm);
    if (w.actualKm != null) totalActual = round1(totalActual + w.actualKm);
    const started = w.startDate != null && w.startDate <= todayIso;
    if (started) {
      plannedToDate = round1(plannedToDate + w.plannedKm);
      weeksElapsed += 1;
    }
  }

  // A session is done when >= 1 ON-PLAN Strava activity is linked to its day, else
  // when its manual log says completed (evidence precedence, lib/derive). An
  // off-plan (day-level) run never completes a planned session, so its evidence is
  // withheld from the done check (decision D2) while still counting as volume above.
  const logByDay = new Map(logs.map((l) => [l.plan_day_id, l] as const));
  let completedSessions = 0;
  for (const day of days) {
    const log = logByDay.get(day.id) ?? null;
    const de = evidenceByDay.get(day.id);
    const evidence = de?.activities ?? [];
    const onPlan = de?.onPlan ?? false;
    if (!log && evidence.length === 0) continue;
    if (effectiveActual(onPlan ? evidence : [], log).done) completedSessions += 1;
  }

  return {
    totalPlannedKm: totalPlanned,
    totalActualKm: totalActual,
    completionRate: totalPlanned > 0 ? clamp01(totalActual / totalPlanned) : 0,
    plannedToDateKm: plannedToDate,
    onPlanRate: plannedToDate > 0 ? clamp01(totalActual / plannedToDate) : 0,
    loggedSessions: completedSessions,
    totalSessions: days.filter((d) => (d.planned_run_km ?? 0) > 0).length,
    weeksElapsed,
    totalWeeks: weekly.length,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Fetch linked Strava evidence for a plan, grouped by plan_day_id. Never throws:
 *  evidence is additive, so a failed read degrades to the manual-log fallback. */
export async function getEvidenceByDay(
  client: TypedSupabaseClient,
  planId: string,
): Promise<EvidenceByDay> {
  try {
    const [{ links, sessionDay }, activities] = await Promise.all([
      getActivityLinksForPlan(client, planId),
      getStravaActivities(client),
    ]);
    return groupEvidenceByDay(links, evidenceById(activities), sessionDay);
  } catch {
    return new Map();
  }
}

/** Async reader: weekly planned-vs-actual km for a plan via the anon client. */
export async function getWeeklyKm(
  client: TypedSupabaseClient,
  planId: string,
): Promise<WeeklyKm[]> {
  const [weeks, days, logs, evidence] = await Promise.all([
    getWeeks(client, planId),
    getDays(client, planId),
    getLogsForPlan(client, planId),
    getEvidenceByDay(client, planId),
  ]);
  return computeWeeklyKm(weeks, days, logs, evidence);
}

/** Async reader: cumulative planned/actual km series for a plan. */
export async function getCumulativeKm(
  client: TypedSupabaseClient,
  planId: string,
): Promise<CumulativePoint[]> {
  return computeCumulative(await getWeeklyKm(client, planId));
}

/** Async reader: plan-wide progress summary for the stat strip. */
export async function getProgressSummary(
  client: TypedSupabaseClient,
  planId: string,
  today?: Date,
): Promise<ProgressSummary> {
  const [weeks, days, logs, evidence] = await Promise.all([
    getWeeks(client, planId),
    getDays(client, planId),
    getLogsForPlan(client, planId),
    getEvidenceByDay(client, planId),
  ]);
  const weekly = computeWeeklyKm(weeks, days, logs, evidence);
  return computeProgressSummary(weekly, logs, days, today, evidence);
}
