import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SessionLog, StravaActivity } from '@/lib/types/database';
import {
  cumulativeEvidence,
  dayHasRunnableSession,
  effectiveActual,
  evidenceById,
  groupEvidenceByDay,
  groupEvidenceBySession,
  isRunnableSessionCategory,
  stravaActivityUrl,
  toActivityEvidence,
  type ActivityEvidence,
} from './session-evidence';
import type { SessionActivityLink } from '@/lib/types/database';

function evidence(partial: Partial<ActivityEvidence>): ActivityEvidence {
  return {
    stravaId: 1,
    name: null,
    photoUrl: null,
    distanceM: null,
    movingTimeS: null,
    elapsedTimeS: null,
    startDate: null,
    sportType: null,
    activityUrl: stravaActivityUrl(partial.stravaId ?? 1),
    ...partial,
  };
}

function log(partial: Partial<SessionLog>): SessionLog {
  return {
    id: 'log-1',
    plan_id: 'plan-1',
    plan_day_id: 'day-1',
    logged_at: '2026-07-14T00:00:00Z',
    actual_distance_km: null,
    actual_duration_min: null,
    actual_pace_text: null,
    actual_rpe: null,
    actual_avg_hr: null,
    completed: true,
    modified: false,
    why_modified: null,
    tomorrow_change: null,
    traffic_light: null,
    shoe_used: null,
    notes: null,
    created_at: '2026-07-14T00:00:00Z',
    updated_at: '2026-07-14T00:00:00Z',
    ...partial,
  } as SessionLog;
}

test('stravaActivityUrl builds the public activity link', () => {
  assert.equal(stravaActivityUrl(123456789), 'https://www.strava.com/activities/123456789');
});

test('toActivityEvidence projects only curated public-safe fields', () => {
  const row = {
    id: 'row-1',
    plan_id: null,
    plan_day_id: null,
    strava_id: 42,
    name: 'Morning Run',
    sport_type: 'Run',
    start_date: '2026-07-13T11:00:00Z',
    distance_m: 10000,
    moving_time_s: 3000,
    elapsed_time_s: 3200,
    average_speed: 3.3,
    average_heartrate: 150,
    max_heartrate: 175,
    total_elevation_gain: 80,
    map_polyline: 'secret-polyline',
    photo_url: 'https://example.com/p.jpg',
    raw: { token: 'should-not-leak' },
    created_at: '',
    updated_at: '',
  } as unknown as StravaActivity;

  const ev = toActivityEvidence(row);
  assert.deepEqual(ev, {
    stravaId: 42,
    name: 'Morning Run',
    photoUrl: 'https://example.com/p.jpg',
    distanceM: 10000,
    movingTimeS: 3000,
    elapsedTimeS: 3200,
    startDate: '2026-07-13T11:00:00Z',
    sportType: 'Run',
    activityUrl: 'https://www.strava.com/activities/42',
  });
  // The raw payload, HR, and map must never appear on the evidence projection.
  assert.equal(Object.prototype.hasOwnProperty.call(ev, 'raw'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ev, 'average_heartrate'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ev, 'map_polyline'), false);
});

test('cumulativeEvidence sums distance and time across a track day', () => {
  const cum = cumulativeEvidence([
    evidence({ stravaId: 1, distanceM: 5000, movingTimeS: 1500, elapsedTimeS: 1600 }),
    evidence({ stravaId: 2, distanceM: 3200, movingTimeS: 900, elapsedTimeS: 950 }),
    evidence({ stravaId: 3, distanceM: 1800, movingTimeS: 600, elapsedTimeS: 650 }),
  ]);
  assert.equal(cum.count, 3);
  assert.equal(cum.distanceKm, 10); // (5000+3200+1800)/1000
  assert.equal(cum.movingTimeS, 3000);
  assert.equal(cum.elapsedTimeS, 3200);
});

test('cumulativeEvidence leaves a metric null when no activity reports it', () => {
  const cum = cumulativeEvidence([
    evidence({ distanceM: 4000, movingTimeS: null }),
    evidence({ distanceM: 2000, movingTimeS: null }),
  ]);
  assert.equal(cum.distanceKm, 6);
  assert.equal(cum.movingTimeS, null);
  assert.equal(cum.elapsedTimeS, null);
});

test('cumulativeEvidence on an empty set is all-null', () => {
  const cum = cumulativeEvidence([]);
  assert.deepEqual(cum, { count: 0, distanceKm: null, movingTimeS: null, elapsedTimeS: null });
});

test('effectiveActual: linked activities win over the manual log and mark done', () => {
  const res = effectiveActual(
    [
      evidence({ distanceM: 12000, movingTimeS: 3600 }),
      evidence({ stravaId: 2, distanceM: 8000, movingTimeS: 2400 }),
    ],
    log({ completed: false, actual_distance_km: 5, actual_duration_min: 30 }),
  );
  assert.equal(res.source, 'strava');
  assert.equal(res.done, true); // >=1 linked activity => DONE, even though the log says not completed
  assert.equal(res.distanceKm, 20); // cumulative, not the log's 5
  assert.equal(res.durationMin, 100); // (3600+2400)/60
  assert.equal(res.activityCount, 2);
});

test('effectiveActual: falls back to the log when no activities are linked', () => {
  const res = effectiveActual([], log({ completed: true, actual_distance_km: 16, actual_duration_min: 88 }));
  assert.equal(res.source, 'log');
  assert.equal(res.done, true);
  assert.equal(res.distanceKm, 16);
  assert.equal(res.durationMin, 88);
  assert.equal(res.activityCount, 0);
});

test('effectiveActual: an incomplete log is not done', () => {
  const res = effectiveActual([], log({ completed: false }));
  assert.equal(res.source, 'log');
  assert.equal(res.done, false);
});

test('effectiveActual: nothing linked and no log is not done', () => {
  const res = effectiveActual([], null);
  assert.deepEqual(res, {
    source: 'none',
    done: false,
    distanceKm: null,
    durationMin: null,
    activityCount: 0,
  });
});

// -----------------------------------------------------------------------------
// On-plan vs off-plan taxonomy + grouping (day-level links, decision D2).
// -----------------------------------------------------------------------------

function activityRow(partial: Partial<StravaActivity>): StravaActivity {
  return {
    id: 'row-1',
    plan_id: null,
    plan_day_id: null,
    strava_id: 1,
    name: null,
    sport_type: 'Run',
    start_date: '2026-07-14T18:00:00Z',
    distance_m: 10000,
    moving_time_s: 3000,
    elapsed_time_s: 3100,
    average_speed: null,
    average_heartrate: null,
    max_heartrate: null,
    total_elevation_gain: null,
    map_polyline: null,
    photo_url: null,
    raw: null,
    created_at: '2026-07-14T00:00:00Z',
    updated_at: '2026-07-14T00:00:00Z',
    ...partial,
  } as StravaActivity;
}

function link(partial: Partial<SessionActivityLink>): SessionActivityLink {
  return {
    id: 'link-1',
    plan_day_id: 'day-1',
    day_session_id: null,
    strava_activity_id: 'row-1',
    created_at: '2026-07-14T00:00:00Z',
    ...partial,
  } as SessionActivityLink;
}

test('isRunnableSessionCategory: rest/strength are not runnable, runs and bike are', () => {
  assert.equal(isRunnableSessionCategory('rest'), false);
  assert.equal(isRunnableSessionCategory('strength_only'), false);
  assert.equal(isRunnableSessionCategory(null), false);
  assert.equal(isRunnableSessionCategory('easy_run'), true);
  assert.equal(isRunnableSessionCategory('long_run'), true);
  assert.equal(isRunnableSessionCategory('race'), true);
  assert.equal(isRunnableSessionCategory('bike'), true);
});

test('dayHasRunnableSession: true only when a runnable session exists', () => {
  assert.equal(dayHasRunnableSession(['strength_only', 'rest']), false);
  assert.equal(dayHasRunnableSession(['rest', 'easy_run']), true);
  assert.equal(dayHasRunnableSession([]), false);
});

test('groupEvidenceByDay: a session-level link is on-plan', () => {
  const byId = evidenceById([activityRow({ id: 'row-1', strava_id: 1 })]);
  const byDay = groupEvidenceByDay(
    [link({ plan_day_id: 'day-1', day_session_id: 'sess-1', strava_activity_id: 'row-1' })],
    byId,
  );
  const de = byDay.get('day-1');
  assert.equal(de?.onPlan, true);
  assert.equal(de?.activities.length, 1);
});

test('groupEvidenceByDay: a day-level (off-plan) link is NOT on-plan but logs volume', () => {
  const byId = evidenceById([activityRow({ id: 'row-1', strava_id: 1, distance_m: 12000 })]);
  const byDay = groupEvidenceByDay(
    [link({ plan_day_id: 'day-1', day_session_id: null, strava_activity_id: 'row-1' })],
    byId,
  );
  const de = byDay.get('day-1');
  // Off-plan: never completes a planned session (onPlan false)...
  assert.equal(de?.onPlan, false);
  // ...but the activity still counts as logged volume for the day.
  assert.equal(de?.activities.length, 1);
  assert.equal(cumulativeEvidence(de!.activities).distanceKm, 12);
});

test('off-plan run never completes a strength day: onPlan gates done, volume still logs', () => {
  const byId = evidenceById([activityRow({ id: 'row-1', strava_id: 1, distance_m: 9000 })]);
  const byDay = groupEvidenceByDay(
    [link({ plan_day_id: 'strength-day', day_session_id: null, strava_activity_id: 'row-1' })],
    byId,
  );
  const de = byDay.get('strength-day');
  // A caller withholds evidence from the done check when off-plan (onPlan false):
  const done = de!.onPlan ? effectiveActual(de!.activities, null).done : effectiveActual([], null).done;
  assert.equal(done, false); // strength session NOT marked done by the off-plan run
  // Volume is still available from the day's evidence.
  assert.equal(cumulativeEvidence(de!.activities).distanceKm, 9);
});

test('groupEvidenceBySession: day-level (null day_session_id) links are excluded', () => {
  const byId = evidenceById([activityRow({ id: 'row-1', strava_id: 1 })]);
  const bySession = groupEvidenceBySession(
    [
      link({ day_session_id: null, strava_activity_id: 'row-1' }),
      link({ id: 'link-2', day_session_id: 'sess-1', strava_activity_id: 'row-1' }),
    ],
    byId,
  );
  assert.equal(bySession.has('sess-1'), true);
  assert.equal(bySession.size, 1); // the null-session link is not grouped
});
