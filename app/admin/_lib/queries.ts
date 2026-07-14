// Owner-context reads for the admin app. These run through the cookie-backed
// server client, so RLS sees the authenticated owner. Reads that later units
// also need live in lib/db; this module only adds admin-specific listings and a
// safe "is the database reachable / seeded" probe used for graceful states.

import { createServerSupabaseClient } from '@/lib/auth/server';
import { getWeeks, getDays, getSessionsForDay, getAlternativesForDay } from '@/lib/db';
import type { Plan, PlanWeek, PlanDay, DaySession, DayAlternative } from '@/lib/types/database';

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
