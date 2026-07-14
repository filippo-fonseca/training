// Sync engine — SERVER-ONLY. One path shared by "Sync now" (owner cookie client)
// and the Vercel cron route (service-role client). Pulls recent activities,
// upserts them, and auto-matches the still-unmatched ones to plan days.

import type { TypedSupabaseClient } from '@/lib/db/client';
import type { Json, StravaActivity } from '@/lib/types/database';
import { DEFAULT_PLAN_SLUG } from '@/lib/db/queries';
import { getStravaConfig } from './config';
import { listActivities } from './api';
import {
  ensureAccessToken,
  getConnection,
  latestActivityStart,
  setActivityPlanDay,
  upsertActivities,
  type StravaActivityInsert,
} from './db';
import {
  dayFamilies,
  matchActivities,
  stravaSportFamily,
  type MatchableActivity,
  type MatchableDay,
  type SportFamily,
} from './match';
import type { StravaSummaryActivity } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_SYNC_WINDOW_MS = 60 * DAY_MS;

export type SyncStatus = 'ok' | 'not_configured' | 'not_connected';

export interface SyncResult {
  status: SyncStatus;
  fetched: number;
  upserted: number;
  matched: number;
  message?: string;
}

function toInsert(a: StravaSummaryActivity): StravaActivityInsert {
  return {
    strava_id: a.id,
    name: a.name ?? null,
    sport_type: a.sport_type ?? a.type ?? null,
    start_date: a.start_date ?? null,
    distance_m: a.distance ?? null,
    moving_time_s: a.moving_time ?? null,
    elapsed_time_s: a.elapsed_time ?? null,
    average_speed: a.average_speed ?? null,
    average_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    total_elevation_gain: a.total_elevation_gain ?? null,
    map_polyline: a.map?.summary_polyline ?? null,
    raw: a as unknown as Json,
  };
}

/** Load the default plan's days as matchable targets (date + supported families). */
async function loadMatchableDays(
  client: TypedSupabaseClient,
): Promise<{ planId: string | null; days: MatchableDay[] }> {
  const { data: plan } = await client
    .from('plans')
    .select('id')
    .eq('slug', DEFAULT_PLAN_SLUG)
    .maybeSingle();
  if (!plan) return { planId: null, days: [] };

  const { data: dayRows } = await client
    .from('plan_days')
    .select('id, date, planned_run_km')
    .eq('plan_id', plan.id);
  if (!dayRows || dayRows.length === 0) return { planId: plan.id, days: [] };

  const dayIds = dayRows.map((d) => d.id);
  const { data: sessionRows } = await client
    .from('day_sessions')
    .select('plan_day_id, category')
    .in('plan_day_id', dayIds);

  const catsByDay = new Map<string, Array<string | null>>();
  for (const s of sessionRows ?? []) {
    const list = catsByDay.get(s.plan_day_id) ?? [];
    list.push(s.category);
    catsByDay.set(s.plan_day_id, list);
  }

  // Families already occupied by a previously-matched activity on that day: drop
  // them so a fresh sync never double-links a second run/ride onto the same day.
  const { data: takenRows } = await client
    .from('strava_activities')
    .select('plan_day_id, sport_type')
    .in('plan_day_id', dayIds)
    .not('plan_day_id', 'is', null);
  const takenByDay = new Map<string, Set<SportFamily>>();
  for (const t of takenRows ?? []) {
    if (!t.plan_day_id) continue;
    const fam = stravaSportFamily(t.sport_type);
    if (fam === 'other') continue;
    const set = takenByDay.get(t.plan_day_id) ?? new Set<SportFamily>();
    set.add(fam);
    takenByDay.set(t.plan_day_id, set);
  }

  const days: MatchableDay[] = dayRows.map((d) => {
    const families = dayFamilies(catsByDay.get(d.id) ?? [], d.planned_run_km);
    for (const fam of takenByDay.get(d.id) ?? []) families.delete(fam);
    return { planDayId: d.id, date: d.date, families };
  });
  return { planId: plan.id, days };
}

/**
 * Run one sync. Returns a summary; never throws for the "not configured / not
 * connected" cases so callers can degrade gracefully.
 */
export async function runStravaSync(client: TypedSupabaseClient): Promise<SyncResult> {
  const config = getStravaConfig();
  if (!config) {
    return { status: 'not_configured', fetched: 0, upserted: 0, matched: 0 };
  }
  const connection = await getConnection(client);
  if (!connection) {
    return { status: 'not_connected', fetched: 0, upserted: 0, matched: 0 };
  }

  const accessToken = await ensureAccessToken(client, config, connection);

  // Watermark: pull activities after the newest we already hold (with a 24h
  // overlap so a late-finalized activity is not missed); first sync uses a
  // bounded recent window.
  const watermark = await latestActivityStart(client);
  const afterMs = watermark
    ? new Date(watermark).getTime() - DAY_MS
    : Date.now() - FIRST_SYNC_WINDOW_MS;
  const after = Math.floor(afterMs / 1000);

  const activities = await listActivities(accessToken, { after });
  const rows = activities.map(toInsert);
  await upsertActivities(client, rows);

  // Auto-match: consider every activity still lacking a plan day (newly synced
  // plus any previously-unmatched), so re-running fills gaps as the plan grows.
  const { planId, days } = await loadMatchableDays(client);
  let matchedCount = 0;
  if (planId && days.length > 0) {
    const { data: unmatched } = await client
      .from('strava_activities')
      .select('strava_id, sport_type, start_date')
      .is('plan_day_id', null);

    const matchable: MatchableActivity[] = (unmatched ?? [])
      .filter((a): a is { strava_id: number; sport_type: string | null; start_date: string } =>
        Boolean(a.start_date),
      )
      .map((a) => ({
        stravaId: a.strava_id,
        startDate: a.start_date,
        family: stravaSportFamily(a.sport_type),
      }));

    const result = matchActivities(days, matchable);
    for (const [stravaId, planDayId] of result.matched) {
      await setActivityPlanDay(client, stravaId, planDayId, planId);
      matchedCount++;
    }
  }

  return {
    status: 'ok',
    fetched: activities.length,
    upserted: rows.length,
    matched: matchedCount,
  };
}

/** Convenience: current activities count and connection presence for the UI. */
export type { StravaActivity };
