// Typed data-access layer. Every function takes a TypedSupabaseClient so callers
// control auth context (anon vs. authenticated owner). Reads throw on error;
// writes return the affected row. RLS is the security boundary — these helpers
// assume it and never use the service role key.

import type { TypedSupabaseClient } from './client';
import type {
  Plan,
  PlanPrivateNotes,
  PlanPrivateNotesInsert,
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
  SessionActivityLink,
} from '../types/database';

export const DEFAULT_PLAN_SLUG = 'baystate-2026';

// Explicit public-safe column list for the plans table. NEVER select('*') on
// plans: the clinical/injury narrative lives in the owner-only
// plan_private_notes table (sealed decision D1), and an explicit projection
// guarantees no future private column can leak into an anon read by accident.
const PLAN_PUBLIC_COLUMNS = [
  'id',
  'slug',
  'title',
  'version',
  'prepared_on',
  'status',
  'athlete_name',
  'athlete_age',
  'race_name',
  'race_distance_km',
  'race_date',
  'race_start_time',
  'race_location',
  'race_course_notes',
  'start_date',
  'end_date',
  'total_planned_km',
  'north_star',
  'plan_logic',
  'goal_a',
  'goal_b',
  'goal_c',
  'created_at',
  'updated_at',
].join(', ');

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
  const { data, error } = await client
    .from('plans')
    .select(PLAN_PUBLIC_COLUMNS)
    .eq('slug', slug)
    .single<Plan>();
  if (error) throw new DbError(`getPlan(${slug})`, error);
  return data;
}

export async function getPlanById(client: TypedSupabaseClient, planId: string): Promise<Plan> {
  const { data, error } = await client
    .from('plans')
    .select(PLAN_PUBLIC_COLUMNS)
    .eq('id', planId)
    .single<Plan>();
  if (error) throw new DbError(`getPlanById(${planId})`, error);
  return data;
}

// -----------------------------------------------------------------------------
// Plan private notes (PRIVATE — owner only; RLS denies everyone else). Holds the
// clinical/injury narrative relocated off the public plans table (D1). Provided
// for owner-side admin use; anon callers get an RLS-denied empty result.
// -----------------------------------------------------------------------------
export async function getPlanPrivateNotes(
  client: TypedSupabaseClient,
  planId: string,
): Promise<PlanPrivateNotes | null> {
  const { data, error } = await client
    .from('plan_private_notes')
    .select('*')
    .eq('plan_id', planId)
    .maybeSingle();
  if (error) throw new DbError(`getPlanPrivateNotes(${planId})`, error);
  return data;
}

/** Insert or update the private clinical notes for a plan (owner only; unique on
 *  plan_id). RLS denies non-owners, so this is safe only in owner context. */
export async function upsertPlanPrivateNotes(
  client: TypedSupabaseClient,
  notes: PlanPrivateNotesInsert,
): Promise<PlanPrivateNotes> {
  const { data, error } = await client
    .from('plan_private_notes')
    .upsert(notes, { onConflict: 'plan_id' })
    .select('*')
    .single();
  if (error) throw new DbError(`upsertPlanPrivateNotes(${notes.plan_id})`, error);
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

/**
 * Every session across a plan, in one round trip. day_sessions has no plan_id of
 * its own (it hangs off plan_day_id), so this reads the plan's days first and
 * then bulk-fetches their sessions with a single `in (...)` filter (no N+1).
 * Public-safe: the columns are the same curated fields the calendar already
 * exposes. Used by the stats aggregation layer for planned-volume-by-type.
 */
export async function getSessionsForPlan(
  client: TypedSupabaseClient,
  planId: string,
): Promise<DaySession[]> {
  const days = await getDays(client, planId);
  const dayIds = days.map((d) => d.id);
  if (dayIds.length === 0) return [];
  const { data, error } = await client
    .from('day_sessions')
    .select('*')
    .in('plan_day_id', dayIds)
    .order('slot', { ascending: true });
  if (error) throw new DbError('getSessionsForPlan', error);
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

/** Remove the log for a day (owner only, enforced by RLS). */
export async function deleteLog(client: TypedSupabaseClient, planDayId: string): Promise<void> {
  const { error } = await client.from('session_logs').delete().eq('plan_day_id', planDayId);
  if (error) throw new DbError('deleteLog', error);
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

/** Insert or update the entry for a day (owner only; unique on plan_day_id). */
export async function upsertHealthEntry(
  client: TypedSupabaseClient,
  entry: HealthEntryInsert,
): Promise<HealthEntry> {
  const { data, error } = await client
    .from('health_entries')
    .upsert(entry, { onConflict: 'plan_day_id' })
    .select('*')
    .single();
  if (error) throw new DbError('upsertHealthEntry', error);
  return data;
}

/** Remove the health entry for a day (owner only, enforced by RLS). */
export async function deleteHealthEntry(client: TypedSupabaseClient, planDayId: string): Promise<void> {
  const { error } = await client.from('health_entries').delete().eq('plan_day_id', planDayId);
  if (error) throw new DbError('deleteHealthEntry', error);
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

// -----------------------------------------------------------------------------
// Session <-> Strava activity links (public read, owner write). A session with
// >= 1 linked activity is DONE; the derivation lives in lib/derive. These helpers
// only fetch and mutate the join rows; grouping happens in the derive module.
// -----------------------------------------------------------------------------

/** Links for a set of day_session ids. Empty in, empty out (no query). */
export async function getActivityLinksForSessions(
  client: TypedSupabaseClient,
  sessionIds: string[],
): Promise<SessionActivityLink[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await client
    .from('session_activity_links')
    .select('*')
    .in('day_session_id', sessionIds);
  if (error) throw new DbError('getActivityLinksForSessions', error);
  return data ?? [];
}

/**
 * Every session-activity link for a plan, resolved by first collecting the
 * plan's day_session ids. Returns the links plus the day_session_id -> plan_day_id
 * map the caller needs to group evidence by day (see groupEvidenceByDay).
 */
export async function getActivityLinksForPlan(
  client: TypedSupabaseClient,
  planId: string,
): Promise<{ links: SessionActivityLink[]; sessionDay: Map<string, string> }> {
  const { data: days, error: daysErr } = await client
    .from('plan_days')
    .select('id')
    .eq('plan_id', planId);
  if (daysErr) throw new DbError('getActivityLinksForPlan(days)', daysErr);
  const dayIds = (days ?? []).map((d) => d.id);
  if (dayIds.length === 0) return { links: [], sessionDay: new Map() };

  const { data: sessions, error: sessErr } = await client
    .from('day_sessions')
    .select('id, plan_day_id')
    .in('plan_day_id', dayIds);
  if (sessErr) throw new DbError('getActivityLinksForPlan(sessions)', sessErr);
  const sessionDay = new Map<string, string>();
  for (const s of sessions ?? []) sessionDay.set(s.id, s.plan_day_id);

  const links = await getActivityLinksForSessions(client, [...sessionDay.keys()]);
  return { links, sessionDay };
}

/**
 * Replace the set of activities linked to a session (owner only; RLS enforces).
 * Inserts the newly-selected links and deletes the de-selected ones; unchanged
 * links are left untouched so created_at is stable. `activityIds` are
 * strava_activities row ids.
 */
export async function setSessionActivityLinks(
  client: TypedSupabaseClient,
  sessionId: string,
  activityIds: string[],
): Promise<void> {
  const desired = new Set(activityIds);
  const existing = await getActivityLinksForSessions(client, [sessionId]);
  const current = new Set(existing.map((l) => l.strava_activity_id));

  const toAdd = [...desired].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !desired.has(id));

  if (toAdd.length > 0) {
    const rows = toAdd.map((strava_activity_id) => ({ day_session_id: sessionId, strava_activity_id }));
    const { error } = await client
      .from('session_activity_links')
      .upsert(rows, { onConflict: 'day_session_id,strava_activity_id', ignoreDuplicates: true });
    if (error) throw new DbError('setSessionActivityLinks(add)', error);
  }
  if (toRemove.length > 0) {
    const { error } = await client
      .from('session_activity_links')
      .delete()
      .eq('day_session_id', sessionId)
      .in('strava_activity_id', toRemove);
    if (error) throw new DbError('setSessionActivityLinks(remove)', error);
  }
}
