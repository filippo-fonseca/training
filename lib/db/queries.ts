// Typed data-access layer. Every function takes a TypedSupabaseClient so callers
// control auth context (anon vs. authenticated owner). Reads throw on error;
// writes return the affected row. RLS is the security boundary — these helpers
// assume it and never use the service role key.

import type { TypedSupabaseClient } from './client';
import type {
  Plan,
  PlanPhase,
  PlanWeek,
  PlanDay,
  DaySession,
  DayAlternative,
  Milestone,
  Checkpoint,
  SessionLog,
  SessionLogInsert,
  HealthEntry,
  HealthEntryInsert,
  StravaActivity,
} from '../types/database';

export const DEFAULT_PLAN_SLUG = 'baystate-2026';

class DbError extends Error {
  constructor(context: string, cause: { message: string; details?: string } | null) {
    super(`${context}: ${cause?.message ?? 'unknown error'}${cause?.details ? ` (${cause.details})` : ''}`);
    this.name = 'DbError';
  }
}

// Composite shapes returned by the convenience readers.
export interface DayDetail {
  day: PlanDay;
  sessions: DaySession[];
  alternatives: DayAlternative[];
}
export interface WeekDetail {
  week: PlanWeek;
  days: PlanDay[];
}

// -----------------------------------------------------------------------------
// Plans
// -----------------------------------------------------------------------------
export async function getPlan(
  client: TypedSupabaseClient,
  slug: string = DEFAULT_PLAN_SLUG,
): Promise<Plan> {
  const { data, error } = await client.from('plans').select('*').eq('slug', slug).single();
  if (error) throw new DbError(`getPlan(${slug})`, error);
  return data;
}

export async function getPlanById(client: TypedSupabaseClient, planId: string): Promise<Plan> {
  const { data, error } = await client.from('plans').select('*').eq('id', planId).single();
  if (error) throw new DbError(`getPlanById(${planId})`, error);
  return data;
}

// -----------------------------------------------------------------------------
// Phases, weeks, days
// -----------------------------------------------------------------------------
export async function getPhases(
  client: TypedSupabaseClient,
  planId: string,
): Promise<PlanPhase[]> {
  const { data, error } = await client
    .from('plan_phases')
    .select('*')
    .eq('plan_id', planId)
    .order('phase_index', { ascending: true });
  if (error) throw new DbError('getPhases', error);
  return data;
}

export async function getWeeks(client: TypedSupabaseClient, planId: string): Promise<PlanWeek[]> {
  const { data, error } = await client
    .from('plan_weeks')
    .select('*')
    .eq('plan_id', planId)
    .order('week_index', { ascending: true });
  if (error) throw new DbError('getWeeks', error);
  return data;
}

export async function getWeek(
  client: TypedSupabaseClient,
  planId: string,
  weekIndex: number,
): Promise<PlanWeek> {
  const { data, error } = await client
    .from('plan_weeks')
    .select('*')
    .eq('plan_id', planId)
    .eq('week_index', weekIndex)
    .single();
  if (error) throw new DbError(`getWeek(${weekIndex})`, error);
  return data;
}

/** A week plus its ordered days. */
export async function getWeekWithDays(
  client: TypedSupabaseClient,
  planId: string,
  weekIndex: number,
): Promise<WeekDetail> {
  const week = await getWeek(client, planId, weekIndex);
  const { data, error } = await client
    .from('plan_days')
    .select('*')
    .eq('week_id', week.id)
    .order('day_index', { ascending: true });
  if (error) throw new DbError(`getWeekWithDays(${weekIndex})`, error);
  return { week, days: data };
}

export async function getDays(client: TypedSupabaseClient, planId: string): Promise<PlanDay[]> {
  const { data, error } = await client
    .from('plan_days')
    .select('*')
    .eq('plan_id', planId)
    .order('day_index', { ascending: true });
  if (error) throw new DbError('getDays', error);
  return data;
}

/** A single day (by ISO date) with its sessions and any symptom-gated alternatives. */
export async function getDay(
  client: TypedSupabaseClient,
  planId: string,
  date: string,
): Promise<DayDetail> {
  const { data: day, error } = await client
    .from('plan_days')
    .select('*')
    .eq('plan_id', planId)
    .eq('date', date)
    .single();
  if (error) throw new DbError(`getDay(${date})`, error);
  const [sessions, alternatives] = await Promise.all([
    getSessionsForDay(client, day.id),
    getAlternativesForDay(client, day.id),
  ]);
  return { day, sessions, alternatives };
}

export async function getSessionsForDay(
  client: TypedSupabaseClient,
  planDayId: string,
): Promise<DaySession[]> {
  const { data, error } = await client
    .from('day_sessions')
    .select('*')
    .eq('plan_day_id', planDayId)
    .order('slot', { ascending: true });
  if (error) throw new DbError('getSessionsForDay', error);
  return data;
}

export async function getAlternativesForDay(
  client: TypedSupabaseClient,
  planDayId: string,
): Promise<DayAlternative[]> {
  const { data, error } = await client
    .from('day_alternatives')
    .select('*')
    .eq('plan_day_id', planDayId);
  if (error) throw new DbError('getAlternativesForDay', error);
  return data;
}

// -----------------------------------------------------------------------------
// Milestones + checkpoints
// -----------------------------------------------------------------------------
export async function getMilestones(
  client: TypedSupabaseClient,
  planId: string,
): Promise<Milestone[]> {
  const { data, error } = await client
    .from('milestones')
    .select('*')
    .eq('plan_id', planId)
    .order('milestone_index', { ascending: true });
  if (error) throw new DbError('getMilestones', error);
  return data;
}

export async function getCheckpoints(
  client: TypedSupabaseClient,
  planId: string,
): Promise<Checkpoint[]> {
  const { data, error } = await client
    .from('checkpoints')
    .select('*')
    .eq('plan_id', planId)
    .order('checkpoint_index', { ascending: true });
  if (error) throw new DbError('getCheckpoints', error);
  return data;
}

// -----------------------------------------------------------------------------
// Session logs (public read, owner write)
// -----------------------------------------------------------------------------
export async function getLogsForPlan(
  client: TypedSupabaseClient,
  planId: string,
): Promise<SessionLog[]> {
  const { data, error } = await client
    .from('session_logs')
    .select('*')
    .eq('plan_id', planId)
    .order('logged_at', { ascending: true });
  if (error) throw new DbError('getLogsForPlan', error);
  return data;
}

/** The log for a single day, or null if none has been recorded yet. */
export async function getLogForDay(
  client: TypedSupabaseClient,
  planDayId: string,
): Promise<SessionLog | null> {
  const { data, error } = await client
    .from('session_logs')
    .select('*')
    .eq('plan_day_id', planDayId)
    .maybeSingle();
  if (error) throw new DbError('getLogForDay', error);
  return data;
}

/** Alias kept for the criteria's naming (getLogsForDay). */
export async function getLogsForDay(
  client: TypedSupabaseClient,
  planDayId: string,
): Promise<SessionLog[]> {
  const log = await getLogForDay(client, planDayId);
  return log ? [log] : [];
}

/** Insert or update the log for a day (owner only; unique on plan_day_id). */
export async function upsertLog(
  client: TypedSupabaseClient,
  log: SessionLogInsert,
): Promise<SessionLog> {
  const { data, error } = await client
    .from('session_logs')
    .upsert(log, { onConflict: 'plan_day_id' })
    .select('*')
    .single();
  if (error) throw new DbError('upsertLog', error);
  return data;
}

// -----------------------------------------------------------------------------
// Health entries (PRIVATE — owner only; RLS denies everyone else)
// -----------------------------------------------------------------------------
export async function getHealthEntriesForDay(
  client: TypedSupabaseClient,
  planDayId: string,
): Promise<HealthEntry[]> {
  const { data, error } = await client
    .from('health_entries')
    .select('*')
    .eq('plan_day_id', planDayId)
    .order('entry_date', { ascending: true });
  if (error) throw new DbError('getHealthEntriesForDay', error);
  return data;
}

export async function upsertHealthEntry(
  client: TypedSupabaseClient,
  entry: HealthEntryInsert,
): Promise<HealthEntry> {
  const { data, error } = await client
    .from('health_entries')
    .upsert(entry)
    .select('*')
    .single();
  if (error) throw new DbError('upsertHealthEntry', error);
  return data;
}

// -----------------------------------------------------------------------------
// Strava activities (public read, owner write)
// -----------------------------------------------------------------------------
export async function getStravaActivities(
  client: TypedSupabaseClient,
  planId?: string,
): Promise<StravaActivity[]> {
  let query = client.from('strava_activities').select('*').order('start_date', { ascending: false });
  if (planId) query = query.eq('plan_id', planId);
  const { data, error } = await query;
  if (error) throw new DbError('getStravaActivities', error);
  return data;
}
