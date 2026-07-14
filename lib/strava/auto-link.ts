// Daily auto-link core. SERVER-ONLY. One code path shared by the Vercel cron
// route (service-role client) and the admin "Auto-link today's runs" button
// (owner cookie client). It refreshes activities via the existing sync, then
// links the day's Run activities to the plan: to the day's running-category
// session when there is one, else at DAY LEVEL (off-plan) so a run on a
// "Nothing planned" day still logs as verified evidence (decision D2).
//
// Time handling (decision D5): the cron fires at 03:00 AND 04:00 UTC daily; this
// core checks the current America/Chicago wall-clock hour and only proceeds when
// it is 22:00 local, so exactly one of the two firings runs each day across the
// CDT/CST switch. `force` bypasses the hour guard for manual/admin runs. No new
// dependencies: the timezone math uses Intl.DateTimeFormat.

import type { TypedSupabaseClient } from '@/lib/db/client';
import { DEFAULT_PLAN_SLUG } from '@/lib/db/queries';
import { isRunnableSessionCategory } from '@/lib/derive';
import { runStravaSync, type SyncResult } from './sync';
import { stravaSportFamily } from './match';

const CHICAGO_TZ = 'America/Chicago';
/** The local Chicago hour the daily auto-link runs at (22:00 = 10pm). */
export const AUTO_LINK_HOUR = 22;

/** Summary returned by a run of the auto-linker. */
export interface AutoLinkSummary {
  /** The Chicago civil date the run targeted (YYYY-MM-DD), or null. */
  date: string | null;
  /** Run activities on that Chicago date that were considered. */
  considered: number;
  /** Links newly created this run. */
  linked: number;
  /** Activities already linked to the day (idempotent no-ops). */
  skippedExisting: number;
  /** Of `linked`, how many attached at DAY LEVEL (off-plan). */
  offPlan: number;
  /** True when the hour guard skipped the linking pass (still synced). */
  skipped?: boolean;
  /** Human-readable reason for a skip / early return. */
  reason?: string;
  /** The refresh sync's outcome (activities are pulled before linking). */
  sync?: { status: SyncResult['status']; fetched: number; matched: number };
}

/**
 * The America/Chicago civil date (YYYY-MM-DD) and wall-clock hour (0-23) of an
 * instant. Uses Intl with hourCycle h23 so midnight is 0, not 24. DST-correct:
 * the IANA zone resolves CDT vs CST for the instant.
 */
export function chicagoDateHour(at: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHICAGO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  let hour = Number.parseInt(get('hour'), 10);
  if (!Number.isFinite(hour)) hour = 0;
  if (hour === 24) hour = 0; // some ICU builds emit 24 for midnight
  return { date, hour };
}

/** The America/Chicago civil date (YYYY-MM-DD) of a UTC ISO instant, or null. */
export function chicagoCalendarDate(utcIso: string | null | undefined): string | null {
  if (!utcIso) return null;
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return null;
  return chicagoDateHour(d).date;
}

export interface AutoLinkOptions {
  /** Bypass the 22:00-Chicago hour guard (manual/admin runs). */
  force?: boolean;
  /** Pin "now" for deterministic runs/tests (defaults to the current instant). */
  now?: Date;
}

interface DaySessionLite {
  id: string;
  slot: 'primary' | 'secondary';
  category: string | null;
}

/**
 * Pick the session a run should complete: a running-category session (anything
 * that is neither rest nor strength-type), preferring the primary slot when both
 * qualify. Returns null when the day has no runnable session (→ off-plan link).
 */
export function pickRunSession(sessions: DaySessionLite[]): DaySessionLite | null {
  const runnable = sessions.filter((s) => isRunnableSessionCategory(s.category));
  if (runnable.length === 0) return null;
  const primary = runnable.find((s) => s.slot === 'primary');
  return primary ?? runnable[0];
}

/**
 * Run one auto-link pass. Refreshes activities via the shared sync, then (unless
 * the hour guard skips it) links the target Chicago day's Run activities. Links
 * are inserted idempotently and never deleted or modified: a second run links 0
 * new. Never throws for the sync's not-configured / not-connected cases.
 */
export async function runAutoLink(
  client: TypedSupabaseClient,
  options: AutoLinkOptions = {},
): Promise<AutoLinkSummary> {
  const now = options.now ?? new Date();
  const { date, hour } = chicagoDateHour(now);

  // (a) Refresh activities first, so a run finished today is available to link.
  const sync = await runStravaSync(client);
  const syncSummary = { status: sync.status, fetched: sync.fetched, matched: sync.matched };
  const base: AutoLinkSummary = {
    date,
    considered: 0,
    linked: 0,
    skippedExisting: 0,
    offPlan: 0,
    sync: syncSummary,
  };

  // (c) Hour guard: only the 22:00-Chicago firing proceeds, unless forced.
  if (!options.force && hour !== AUTO_LINK_HOUR) {
    return {
      ...base,
      skipped: true,
      reason: `Chicago hour is ${hour}; auto-link runs at ${AUTO_LINK_HOUR}`,
    };
  }

  // (e) The plan day for this Chicago date.
  const { data: plan } = await client
    .from('plans')
    .select('id')
    .eq('slug', DEFAULT_PLAN_SLUG)
    .maybeSingle();
  if (!plan) return { ...base, reason: 'no plan' };

  const { data: planDay } = await client
    .from('plan_days')
    .select('id')
    .eq('plan_id', plan.id)
    .eq('date', date)
    .maybeSingle();
  if (!planDay) return { ...base, reason: 'no plan day' };

  // (f) The session a run should complete, if any (else off-plan / day-level).
  const { data: sessionRows } = await client
    .from('day_sessions')
    .select('id, slot, category')
    .eq('plan_day_id', planDay.id);
  const target = pickRunSession((sessionRows ?? []) as DaySessionLite[]);

  // (d) Synced Run activities whose start converts to this Chicago date.
  const { data: activityRows } = await client
    .from('strava_activities')
    .select('id, sport_type, start_date')
    .not('start_date', 'is', null);
  const runs = (activityRows ?? []).filter(
    (a) => stravaSportFamily(a.sport_type) === 'run' && chicagoCalendarDate(a.start_date) === date,
  );

  let linked = 0;
  let skippedExisting = 0;
  let offPlan = 0;

  // (g) Insert idempotently: on conflict do nothing (upsert + ignoreDuplicates).
  // Existing links are never deleted or modified. A returned row = a new link.
  for (const a of runs) {
    const row = {
      plan_day_id: planDay.id,
      day_session_id: target ? target.id : null,
      strava_activity_id: a.id,
    };
    const { data: inserted, error } = await client
      .from('session_activity_links')
      .upsert(row, { onConflict: 'plan_day_id,strava_activity_id', ignoreDuplicates: true })
      .select('id');
    if (error) {
      throw new Error(`runAutoLink(link ${a.id}): ${error.message}`);
    }
    if (inserted && inserted.length > 0) {
      linked += 1;
      if (!target) offPlan += 1;
    } else {
      skippedExisting += 1;
    }
  }

  return {
    date,
    considered: runs.length,
    linked,
    skippedExisting,
    offPlan,
    sync: syncSummary,
  };
}
