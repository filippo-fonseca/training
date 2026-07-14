// Owner-context reads for the admin app. These run through the cookie-backed
// server client, so RLS sees the authenticated owner. Reads that later units
// also need live in lib/db; this module only adds admin-specific listings and a
// safe "is the database reachable / seeded" probe used for graceful states.

import { createServerSupabaseClient } from '@/lib/auth/server';
import { getWeeks, getDays, getSessionsForDay, getAlternativesForDay, getPlan, DEFAULT_PLAN_SLUG } from '@/lib/db';
import { todayInNewYork } from '@/components/calendar/date-utils';
import type {
  Plan,
  PlanWeek,
  PlanDay,
  DaySession,
  DayAlternative,
  SessionLog,
  HealthEntry,
} from '@/lib/types/database';

export interface PlanSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  race_name: string | null;
  race_date: string | null;
  start_date: string | null;
  end_date: string | null;
  total_planned_km: number | null;
}

export interface PlansResult {
  ok: boolean;
  plans: PlanSummary[];
  error?: string;
}

/** List every plan (owner context). Never throws: returns ok:false on failure so
 *  admin pages can render a "not seeded yet / not configured" state. */
export async function listPlans(): Promise<PlansResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('plans')
      .select('id, slug, title, status, race_name, race_date, start_date, end_date, total_planned_km')
      .order('created_at', { ascending: true });
    if (error) return { ok: false, plans: [], error: error.message };
    return { ok: true, plans: (data ?? []) as PlanSummary[] };
  } catch (e) {
    return { ok: false, plans: [], error: e instanceof Error ? e.message : 'unknown error' };
  }
}

/** A single plan by id, or null. Throws only on unexpected errors. */
export async function getPlanOrNull(planId: string): Promise<Plan | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('plans').select('*').eq('id', planId).maybeSingle();
  if (error) throw new Error(`getPlanOrNull(${planId}): ${error.message}`);
  return data ?? null;
}

export interface PlanCounts {
  phases: number;
  weeks: number;
  days: number;
  milestones: number;
  checkpoints: number;
}

const COUNT_TABLES = [
  ['phases', 'plan_phases'],
  ['weeks', 'plan_weeks'],
  ['days', 'plan_days'],
  ['milestones', 'milestones'],
  ['checkpoints', 'checkpoints'],
] as const;

/** Exact row counts per child table for a plan (owner context). */
export async function getPlanCounts(planId: string): Promise<PlanCounts> {
  const supabase = await createServerSupabaseClient();
  const results = await Promise.all(
    COUNT_TABLES.map(([, table]) =>
      supabase.from(table).select('*', { count: 'exact', head: true }).eq('plan_id', planId),
    ),
  );
  const counts = {} as PlanCounts;
  COUNT_TABLES.forEach(([key], i) => {
    counts[key] = results[i].count ?? 0;
  });
  return counts;
}

// -----------------------------------------------------------------------------
// Days list + day editor bundles (owner context)
// -----------------------------------------------------------------------------
export interface PrimarySummary {
  title: string;
  distance_km: number | null;
}

export interface DaysOverview {
  weeks: PlanWeek[];
  days: PlanDay[];
  /** plan_day_id -> its primary session summary, when present. */
  primaryByDay: Map<string, PrimarySummary>;
}

/** Weeks + days + each day's primary session, for the days list grouped by week. */
export async function getDaysOverview(planId: string): Promise<DaysOverview> {
  const supabase = await createServerSupabaseClient();
  const [weeks, days] = await Promise.all([getWeeks(supabase, planId), getDays(supabase, planId)]);

  const primaryByDay = new Map<string, PrimarySummary>();
  if (days.length > 0) {
    const { data } = await supabase
      .from('day_sessions')
      .select('plan_day_id, title, distance_km')
      .eq('slot', 'primary')
      .in(
        'plan_day_id',
        days.map((d) => d.id),
      );
    for (const s of data ?? []) {
      primaryByDay.set(s.plan_day_id, { title: s.title, distance_km: s.distance_km });
    }
  }
  return { weeks, days, primaryByDay };
}

export interface DayEditorData {
  day: PlanDay;
  sessions: DaySession[];
  alternatives: DayAlternative[];
  weeks: PlanWeek[];
}

/** Everything the day editor needs, or null when the day does not exist. */
export async function getDayEditorData(planId: string, dayId: string): Promise<DayEditorData | null> {
  const supabase = await createServerSupabaseClient();
  const { data: day, error } = await supabase
    .from('plan_days')
    .select('*')
    .eq('id', dayId)
    .eq('plan_id', planId)
    .maybeSingle();
  if (error) throw new Error(`getDayEditorData(${dayId}): ${error.message}`);
  if (!day) return null;

  const [sessions, alternatives, weeks] = await Promise.all([
    getSessionsForDay(supabase, day.id),
    getAlternativesForDay(supabase, day.id),
    getWeeks(supabase, planId),
  ]);
  return { day, sessions, alternatives, weeks };
}

// -----------------------------------------------------------------------------
// Logging + health surfaces (owner context). /admin/log and /admin/health are
// top-level (not nested under a planId route), so they resolve the one active
// plan themselves rather than taking it from the URL.
// -----------------------------------------------------------------------------

/** The default plan (owner context), or null when unconfigured/not seeded yet. */
export async function getPlanForAdminSurfaces(): Promise<Plan | null> {
  try {
    const supabase = await createServerSupabaseClient();
    return await getPlan(supabase, DEFAULT_PLAN_SLUG);
  } catch {
    return null;
  }
}

export interface WeekContext {
  weeks: PlanWeek[];
  weekIndex: number;
  week: PlanWeek | null;
}

/** Resolve which plan week to show: the requested index (clamped), or today's week, or week 1. */
export async function resolveWeekIndex(planId: string, requested: number | null): Promise<WeekContext> {
  const supabase = await createServerSupabaseClient();
  const weeks = await getWeeks(supabase, planId);
  const firstIndex = weeks[0]?.week_index ?? 1;
  const lastIndex = weeks.at(-1)?.week_index ?? firstIndex;

  let weekIndex = requested;
  if (weekIndex == null) {
    const today = todayInNewYork();
    const { data } = await supabase
      .from('plan_days')
      .select('week_number')
      .eq('plan_id', planId)
      .eq('date', today)
      .maybeSingle();
    weekIndex = data?.week_number ?? firstIndex;
  }
  weekIndex = Math.min(Math.max(weekIndex, firstIndex), lastIndex);

  const week = weeks.find((w) => w.week_index === weekIndex) ?? null;
  return { weeks, weekIndex, week };
}

/** Every day in a plan week, ordered by date. */
async function getDaysForWeek(planId: string, weekIndex: number): Promise<PlanDay[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', planId)
    .eq('week_number', weekIndex)
    .order('date', { ascending: true });
  if (error) throw new Error(`getDaysForWeek(${weekIndex}): ${error.message}`);
  return data ?? [];
}

export interface LogDayRow {
  day: PlanDay;
  primary: DaySession | null;
  log: SessionLog | null;
  alternatives: DayAlternative[];
}

/** Each day in the week plus its primary session, existing log, and gated alternatives. */
export async function getLogRowsForWeek(planId: string, weekIndex: number): Promise<LogDayRow[]> {
  const days = await getDaysForWeek(planId, weekIndex);
  const dayIds = days.map((d) => d.id);
  if (dayIds.length === 0) return [];

  const supabase = await createServerSupabaseClient();
  const [sessionsRes, logsRes, altsRes] = await Promise.all([
    supabase.from('day_sessions').select('*').eq('slot', 'primary').in('plan_day_id', dayIds),
    supabase.from('session_logs').select('*').in('plan_day_id', dayIds),
    supabase.from('day_alternatives').select('*').in('plan_day_id', dayIds),
  ]);
  if (sessionsRes.error) throw new Error(`getLogRowsForWeek sessions: ${sessionsRes.error.message}`);
  if (logsRes.error) throw new Error(`getLogRowsForWeek logs: ${logsRes.error.message}`);
  if (altsRes.error) throw new Error(`getLogRowsForWeek alternatives: ${altsRes.error.message}`);

  const primaryByDay = new Map((sessionsRes.data ?? []).map((s) => [s.plan_day_id, s] as const));
  const logByDay = new Map((logsRes.data ?? []).map((l) => [l.plan_day_id, l] as const));
  const altsByDay = new Map<string, DayAlternative[]>();
  for (const a of altsRes.data ?? []) {
    const list = altsByDay.get(a.plan_day_id) ?? [];
    list.push(a);
    altsByDay.set(a.plan_day_id, list);
  }

  return days.map((day) => ({
    day,
    primary: primaryByDay.get(day.id) ?? null,
    log: logByDay.get(day.id) ?? null,
    alternatives: altsByDay.get(day.id) ?? [],
  }));
}

export interface HealthDayRow {
  day: PlanDay;
  entry: HealthEntry | null;
}

/** Each day in the week plus its health entry, if recorded. PRIVATE: owner context only. */
export async function getHealthRowsForWeek(planId: string, weekIndex: number): Promise<HealthDayRow[]> {
  const days = await getDaysForWeek(planId, weekIndex);
  const dayIds = days.map((d) => d.id);
  if (dayIds.length === 0) return [];

  const supabase = await createServerSupabaseClient();
  const { data: entries, error } = await supabase.from('health_entries').select('*').in('plan_day_id', dayIds);
  if (error) throw new Error(`getHealthRowsForWeek: ${error.message}`);

  const entryByDay = new Map((entries ?? []).map((e) => [e.plan_day_id as string, e] as const));
  return days.map((day) => ({ day, entry: entryByDay.get(day.id) ?? null }));
}
