// Stats aggregation helpers. Additive to the data-access layer, mirroring
// progress.ts: pure TypeScript reducers over typed rows (no inline SQL, no chart
// library) plus thin async readers. Everything here is public-safe. It reads
// only curated plan/session/log fields (never health_entries, never private
// notes), so the /stats page can render entirely from the anon client.
//
// The plan begins 2026-07-13 and logs accrue over time, so most days legitimately
// have no completed volume yet. The shapes below make that empty/sparse state
// explicit (completedKm stays 0, hasLog false) so the heatmap can render a clean
// "planned but not run" grid rather than a misleading wall of zeros.

import type { TypedSupabaseClient } from './client';
import type {
  Plan,
  PlanWeek,
  PlanDay,
  DaySession,
  SessionLog,
  SessionCategory,
} from '../types/database';
import { getWeeks, getDays, getLogsForPlan, getSessionsForPlan } from './queries';

/** One plan day as a heatmap cell: planned running volume plus completed volume. */
export interface HeatmapCell {
  date: string; // 'YYYY-MM-DD'
  weekNumber: number; // 1-based plan week (grid column)
  plannedKm: number;
  /** Logged actual km for the day (0 until a completed log lands). */
  completedKm: number;
  /** Logged actual minutes for the day, or null when untimed/absent. */
  completedMin: number | null;
  /** True for a non-running day (rest / strength / bike): the quiet tier. */
  isRest: boolean;
  /** True on race day: the finish line, styled specially. */
  isRace: boolean;
  /** True when a completed session log exists for the day. */
  hasLog: boolean;
  /** Count of prescribed non-rest sessions on the day. */
  sessionsPlanned: number;
}

/** Planned kilometres attributed to a single session category. */
export interface TypeBreakdown {
  category: SessionCategory;
  label: string;
  plannedKm: number;
}

/** Plan-wide figures for the /stats strip and blocks. */
export interface StatsSummary {
  totalPlannedKm: number;
  totalCompletedKm: number;
  sessionsPlanned: number;
  sessionsCompleted: number;
  /** sessionsCompleted / sessionsPlanned, 0..1. */
  completionRate: number;
  /** Sum of prescribed session minutes (planned time on feet). */
  plannedMinutes: number;
  /** Sum of logged actual minutes; 0 until sessions are timed. */
  actualMinutes: number;
  hasActualTime: boolean;
  /** Trailing run of consecutive on-plan days ending at the last elapsed day. */
  currentStreak: number;
  /** Longest run of consecutive on-plan days across the elapsed plan. */
  longestStreak: number;
  /** Whole days from today to race day (0 once the race has passed). */
  daysUntilRace: number;
  /** Plan weeks fully elapsed (end date before today). */
  weeksCompleted: number;
  totalWeeks: number;
  /** Planned km grouped by session category, descending. */
  byType: TypeBreakdown[];
  /** Largest single-day completed km (the heatmap intensity ceiling). */
  maxDayVolumeKm: number;
  anyLogged: boolean;
}

export interface StatsData {
  summary: StatsSummary;
  heatmap: HeatmapCell[];
}

const CATEGORY_LABELS: Record<SessionCategory, string> = {
  easy_run: 'Easy',
  long_run: 'Long run',
  quality_run: 'Quality',
  bike: 'Bike',
  strength_only: 'Strength',
  rest: 'Rest',
  race: 'Race',
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Parse 'YYYY-MM-DD' at UTC noon (DST-proof for whole-day arithmetic). */
function isoToUtcNoon(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Whole days between two ISO dates (b - a); negative when b precedes a. */
export function daysBetween(a: string, b: string): number {
  const ms = isoToUtcNoon(b).getTime() - isoToUtcNoon(a).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Pure reducer: fold a plan's weeks, days, sessions, and logs into the /stats
 * summary and per-day heatmap cells. `today` is injectable so pages can pin
 * "now" for deterministic rendering (defaults to the current date).
 */
export function computeStats(
  plan: Plan,
  weeks: PlanWeek[],
  days: PlanDay[],
  sessions: DaySession[],
  logs: SessionLog[],
  today: Date = new Date(),
): StatsData {
  const todayIso = today.toISOString().slice(0, 10);

  // Sessions grouped by their plan day.
  const sessionsByDay = new Map<string, DaySession[]>();
  for (const s of sessions) {
    const list = sessionsByDay.get(s.plan_day_id) ?? [];
    list.push(s);
    sessionsByDay.set(s.plan_day_id, list);
  }

  // Completed logs keyed by plan day (a day has at most one log).
  const logByDay = new Map<string, SessionLog>();
  for (const log of logs) logByDay.set(log.plan_day_id, log);

  const raceDate = plan.race_date;

  // --- Per-day heatmap cells + running totals ---
  const sortedDays = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const heatmap: HeatmapCell[] = [];

  let totalPlannedKm = 0;
  let totalCompletedKm = 0;
  let sessionsPlanned = 0;
  let sessionsCompleted = 0;
  let plannedMinutes = 0;
  let actualMinutes = 0;
  let maxDayVolumeKm = 0;
  const byTypeMap = new Map<SessionCategory, number>();

  for (const day of sortedDays) {
    const daySessions = sessionsByDay.get(day.id) ?? [];
    const nonRest = daySessions.filter((s) => s.category !== 'rest');
    const log = logByDay.get(day.id) ?? null;
    const completed = log?.completed === true;

    const plannedKm = round1(day.planned_run_km ?? 0);
    const completedKm = completed ? round1(log?.actual_distance_km ?? 0) : 0;
    const completedMin = completed ? log?.actual_duration_min ?? null : null;

    totalPlannedKm = round1(totalPlannedKm + plannedKm);
    totalCompletedKm = round1(totalCompletedKm + completedKm);
    sessionsPlanned += nonRest.length;
    if (completed) sessionsCompleted += nonRest.length;
    if (completedKm > maxDayVolumeKm) maxDayVolumeKm = completedKm;

    for (const s of daySessions) {
      if (s.duration_min_minutes != null) plannedMinutes += s.duration_min_minutes;
      if (s.category && s.distance_km != null && s.category !== 'rest') {
        byTypeMap.set(s.category, round1((byTypeMap.get(s.category) ?? 0) + s.distance_km));
      }
    }
    if (completed && log?.actual_duration_min != null) actualMinutes += log.actual_duration_min;

    heatmap.push({
      date: day.date,
      weekNumber: day.week_number ?? weekNumberFor(day.date, weeks),
      plannedKm,
      completedKm,
      completedMin,
      isRest: plannedKm === 0,
      isRace: raceDate != null && day.date === raceDate,
      hasLog: completed,
      sessionsPlanned: nonRest.length,
    });
  }

  // --- Streaks over elapsed days (a non-running day never breaks the streak) ---
  const elapsed = heatmap.filter((c) => c.date <= todayIso);
  let longestStreak = 0;
  let run = 0;
  for (const c of elapsed) {
    const onPlan = c.isRest || c.hasLog;
    run = onPlan ? run + 1 : 0;
    if (run > longestStreak) longestStreak = run;
  }
  // Current streak: the trailing run ending at the last elapsed day. Today is
  // still in progress, so an un-logged today is skipped (not a break) and the
  // count continues from yesterday; a logged or rest today extends the streak.
  let currentStreak = 0;
  let start = elapsed.length - 1;
  if (start >= 0) {
    const last = elapsed[start];
    if (last.date === todayIso && !last.isRest && !last.hasLog) start -= 1;
  }
  for (let i = start; i >= 0; i--) {
    const c = elapsed[i];
    if (c.isRest || c.hasLog) currentStreak += 1;
    else break;
  }

  // --- Weeks fully elapsed ---
  const weeksCompleted = weeks.filter((w) => w.end_date != null && w.end_date < todayIso).length;

  // --- Days until race ---
  const daysUntilRace = raceDate ? Math.max(0, daysBetween(todayIso, raceDate)) : 0;

  const byType: TypeBreakdown[] = [...byTypeMap.entries()]
    .map(([category, plannedKm]) => ({ category, label: CATEGORY_LABELS[category], plannedKm }))
    .filter((t) => t.plannedKm > 0)
    .sort((a, b) => b.plannedKm - a.plannedKm);

  const summary: StatsSummary = {
    totalPlannedKm,
    totalCompletedKm,
    sessionsPlanned,
    sessionsCompleted,
    completionRate: sessionsPlanned > 0 ? clamp01(sessionsCompleted / sessionsPlanned) : 0,
    plannedMinutes,
    actualMinutes,
    hasActualTime: actualMinutes > 0,
    currentStreak,
    longestStreak,
    daysUntilRace,
    weeksCompleted,
    totalWeeks: weeks.length,
    byType,
    maxDayVolumeKm,
    anyLogged: logs.some((l) => l.completed),
  };

  return { summary, heatmap };
}

/** Which 1-based plan week contains `date`, or 0 when it falls outside. */
function weekNumberFor(date: string, weeks: PlanWeek[]): number {
  for (const w of weeks) {
    if (w.start_date && w.end_date && date >= w.start_date && date <= w.end_date) {
      return w.week_index;
    }
  }
  return 0;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Async reader: the full /stats payload for an already-loaded plan via the anon
 * client. The caller resolves the Plan (its race_date drives the countdown and
 * the heatmap's race cell), then this fans out the weeks/days/sessions/logs
 * reads in parallel and folds them with the pure reducer above.
 */
export async function getStats(
  client: TypedSupabaseClient,
  plan: Plan,
  today?: Date,
): Promise<StatsData> {
  const [weeks, days, sessions, logs] = await Promise.all([
    getWeeks(client, plan.id),
    getDays(client, plan.id),
    getSessionsForPlan(client, plan.id),
    getLogsForPlan(client, plan.id),
  ]);
  return computeStats(plan, weeks, days, sessions, logs, today);
}
