/**
 * Server-side data access for the public calendar + day detail. Everything here
 * reads through the PUBLIC anon/publishable key — RLS is the security boundary,
 * and no health data is ever fetched by these views. Every reader is defensive:
 * if the environment is unconfigured or the database is unreachable, it returns
 * null so the page can render a graceful fallback instead of crashing the route.
 */

import {
  createSupabaseClient,
  DEFAULT_PLAN_SLUG,
  getPlan,
  getWeeks,
  getDays,
  getMilestones,
  getLogsForPlan,
  getDay,
  getLogForDay,
  getStravaActivities,
  getActivityLinksForDays,
  type TypedSupabaseClient,
} from '@/lib/db';
import type {
  Plan,
  PlanWeek,
  PlanDay,
  DaySession,
  DayAlternative,
  Milestone,
  SessionLog,
} from '@/lib/types/database';
import {
  evidenceById,
  groupEvidenceByDay,
  type ActivityEvidence,
} from '@/lib/derive';
import { deriveStatus, type DayStatus } from './status';
import { addDays, todayInNewYork, type ISODate } from './date-utils';

/** Build a public (anon) client, or null when env is not configured. */
export function getAnonClient(): TypedSupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    return createSupabaseClient(url, key);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Calendar (month + week views)
// -----------------------------------------------------------------------------
export interface CalendarDay {
  day: PlanDay;
  primary: DaySession | null;
  secondary: DaySession | null;
  log: SessionLog | null;
  /** Linked Strava activities for the day (evidence): session-level + day-level. */
  evidence: ActivityEvidence[];
  /** True when the day's evidence is only day-level (off-plan): a run on a day
   *  that planned no running session. It logs volume but completes nothing. */
  offPlan: boolean;
  status: DayStatus;
}

export interface CalendarData {
  plan: Plan;
  weeks: PlanWeek[];
  weeksByIndex: Map<number, PlanWeek>;
  daysByDate: Map<ISODate, CalendarDay>;
  milestonesByDate: Map<ISODate, Milestone[]>;
  today: ISODate;
  planStart: ISODate | null;
  planEnd: ISODate | null;
}

export async function getCalendarData(
  slug: string = DEFAULT_PLAN_SLUG,
): Promise<CalendarData | null> {
  const client = getAnonClient();
  if (!client) return null;

  try {
    const plan = await getPlan(client, slug);
    const [weeks, days, milestones, logs] = await Promise.all([
      getWeeks(client, plan.id),
      getDays(client, plan.id),
      getMilestones(client, plan.id),
      getLogsForPlan(client, plan.id),
    ]);

    // One bulk fetch of every session for the plan's days, then group by day.
    const dayIds = days.map((d) => d.id);
    const sessions = await getSessionsForDays(client, dayIds);

    const primaryByDay = new Map<string, DaySession>();
    const secondaryByDay = new Map<string, DaySession>();
    const sessionDay = new Map<string, string>();
    for (const s of sessions) {
      sessionDay.set(s.id, s.plan_day_id);
      if (s.slot === 'primary') primaryByDay.set(s.plan_day_id, s);
      else secondaryByDay.set(s.plan_day_id, s);
    }

    const logByDay = new Map<string, SessionLog>();
    for (const log of logs) logByDay.set(log.plan_day_id, log);

    // Linked Strava evidence grouped by plan day (public read; may be empty).
    // Fetch by plan_day_id so day-level (off-plan) links are included.
    const [links, activities] = await Promise.all([
      getActivityLinksForDays(client, dayIds),
      getStravaActivities(client),
    ]);
    const evidenceByDay = groupEvidenceByDay(links, evidenceById(activities), sessionDay);

    const today = todayInNewYork();
    const daysByDate = new Map<ISODate, CalendarDay>();
    for (const day of days) {
      const primary = primaryByDay.get(day.id) ?? null;
      const log = logByDay.get(day.id) ?? null;
      const de = evidenceByDay.get(day.id);
      const evidence = de?.activities ?? [];
      const onPlan = de?.onPlan ?? false;
      // Off-plan evidence never completes the planned session, so only on-plan
      // links drive the "logged" status (decision D2).
      daysByDate.set(day.date, {
        day,
        primary,
        secondary: secondaryByDay.get(day.id) ?? null,
        log,
        evidence,
        offPlan: evidence.length > 0 && !onPlan,
        status: deriveStatus(primary?.category ?? null, day.date, today, log, onPlan ? evidence.length : 0),
      });
    }

    const milestonesByDate = new Map<ISODate, Milestone[]>();
    for (const m of milestones) {
      if (!m.date) continue;
      const list = milestonesByDate.get(m.date) ?? [];
      list.push(m);
      milestonesByDate.set(m.date, list);
    }

    const weeksByIndex = new Map<number, PlanWeek>();
    for (const w of weeks) weeksByIndex.set(w.week_index, w);

    return {
      plan,
      weeks,
      weeksByIndex,
      daysByDate,
      milestonesByDate,
      today,
      planStart: plan.start_date ?? null,
      planEnd: plan.end_date ?? null,
    };
  } catch {
    return null;
  }
}

/** Bulk-fetch every session for a set of plan_day ids (avoids N+1 per day). */
async function getSessionsForDays(
  client: TypedSupabaseClient,
  dayIds: string[],
): Promise<DaySession[]> {
  if (dayIds.length === 0) return [];
  const { data, error } = await client
    .from('day_sessions')
    .select('*')
    .in('plan_day_id', dayIds)
    .order('slot', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// -----------------------------------------------------------------------------
// Day detail
// -----------------------------------------------------------------------------
export interface DayData {
  plan: Plan;
  day: PlanDay;
  week: PlanWeek | null;
  primary: DaySession | null;
  secondary: DaySession | null;
  alternatives: DayAlternative[];
  milestones: Milestone[];
  log: SessionLog | null;
  /** Linked Strava activities for the day (evidence): session-level + day-level. */
  evidence: ActivityEvidence[];
  /** True when the day's evidence is only day-level (off-plan): a run on a day
   *  that planned no running session. It logs volume but completes nothing. */
  offPlan: boolean;
  status: DayStatus;
  today: ISODate;
  prevDate: ISODate | null;
  nextDate: ISODate | null;
}

/**
 * Full detail for one date. Returns `undefined` when the plan/day cannot be
 * loaded (route should render a fallback) and `null` when the date is valid but
 * not part of the plan (route should soft-404).
 */
export async function getDayData(
  date: ISODate,
  slug: string = DEFAULT_PLAN_SLUG,
): Promise<DayData | null | undefined> {
  const client = getAnonClient();
  if (!client) return undefined;

  let plan: Plan;
  try {
    plan = await getPlan(client, slug);
  } catch {
    return undefined;
  }

  let detail;
  try {
    detail = await getDay(client, plan.id, date);
  } catch {
    // getDay throws when no row matches the date → treat as "not in plan".
    return null;
  }

  const { day, sessions, alternatives } = detail;
  const primary = sessions.find((s) => s.slot === 'primary') ?? null;
  const secondary = sessions.find((s) => s.slot === 'secondary') ?? null;

  const [weeks, milestones, log, links, activities] = await Promise.all([
    getWeeks(client, plan.id).catch(() => [] as PlanWeek[]),
    getMilestones(client, plan.id).catch(() => [] as Milestone[]),
    getLogForDay(client, day.id).catch(() => null),
    // Fetch by plan_day_id so day-level (off-plan) links are included.
    getActivityLinksForDays(client, [day.id]).catch(() => []),
    getStravaActivities(client).catch(() => []),
  ]);

  const sessionDay = new Map(sessions.map((s) => [s.id, day.id] as const));
  const evidenceByDay = groupEvidenceByDay(links, evidenceById(activities), sessionDay);
  const de = evidenceByDay.get(day.id);
  const evidence = de?.activities ?? [];
  const onPlan = de?.onPlan ?? false;

  const week = weeks.find((w) => w.id === day.week_id) ?? null;
  const dayMilestones = milestones.filter((m) => m.date === date);
  const today = todayInNewYork();

  return {
    plan,
    day,
    week,
    primary,
    secondary,
    alternatives,
    milestones: dayMilestones,
    log,
    evidence,
    offPlan: evidence.length > 0 && !onPlan,
    // Off-plan evidence never completes the planned session, so only on-plan
    // links drive the "logged" status (decision D2).
    status: deriveStatus(primary?.category ?? null, date, today, log, onPlan ? evidence.length : 0),
    today,
    prevDate:
      plan.start_date && date > plan.start_date
        ? maxBound(addDays(date, -1), plan.start_date, 'min')
        : null,
    nextDate:
      plan.end_date && date < plan.end_date
        ? maxBound(addDays(date, 1), plan.end_date, 'max')
        : null,
  };
}

/** Keep a stepped date inside the plan span; null when it would fall outside. */
function maxBound(candidate: ISODate, bound: ISODate, kind: 'min' | 'max'): ISODate | null {
  if (kind === 'min') return candidate >= bound ? candidate : null;
  return candidate <= bound ? candidate : null;
}
