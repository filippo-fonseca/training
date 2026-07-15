import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  Plan,
  PlanWeek,
  PlanDay,
  DaySession,
  SessionLog,
} from '../types/database';
import type { ActivityEvidence, DayEvidence } from '../derive';
import { stravaActivityUrl } from '../derive';
import type { EvidenceByDay } from './progress';
import { computeStats } from './stats';

// -----------------------------------------------------------------------------
// stats.ts consumes the SAME evidence seam as progress.ts (DEF-L2-1): the heatmap
// and stat tiles must count a day with linked Strava evidence, not only manual
// session_logs. Volume counts on-plan AND off-plan; completion counts on-plan
// only (decision D2); an on-plan day extends the streak.
// -----------------------------------------------------------------------------

function ev(partial: Partial<ActivityEvidence>): ActivityEvidence {
  return {
    stravaId: 1,
    name: null,
    photoUrl: null,
    distanceM: null,
    movingTimeS: null,
    elapsedTimeS: null,
    startDate: null,
    sportType: 'Run',
    activityUrl: stravaActivityUrl(partial.stravaId ?? 1),
    ...partial,
  };
}

function log(partial: Partial<SessionLog>): SessionLog {
  return {
    id: 'log-x',
    plan_id: 'plan-1',
    plan_day_id: 'day-1',
    logged_at: '2026-07-13T00:00:00Z',
    actual_distance_km: null,
    actual_duration_min: null,
    actual_pace_text: null,
    actual_rpe: null,
    actual_avg_hr: null,
    completed: false,
    modified: false,
    why_modified: null,
    tomorrow_change: null,
    traffic_light: null,
    shoe_used: null,
    notes: null,
    created_at: '2026-07-13T00:00:00Z',
    updated_at: '2026-07-13T00:00:00Z',
    ...partial,
  } as SessionLog;
}

const PLAN = { id: 'plan-1', race_date: '2026-10-18' } as Plan;

const WEEKS: PlanWeek[] = [
  {
    id: 'wk-1',
    plan_id: 'plan-1',
    week_index: 1,
    start_date: '2026-07-13',
    end_date: '2026-07-19',
    phase_label: 'Return to normal running',
    planned_km: 16,
  } as PlanWeek,
];

// day-1: 2026-07-13, a planned RUNNING day (quality_run) completed via ON-PLAN
// linked evidence (no manual log needed). day-2: 2026-07-14, a strength/rest day
// (planned_run_km 0) with an OFF-PLAN day-level run.
const DAYS: PlanDay[] = [
  {
    id: 'day-1',
    plan_id: 'plan-1',
    week_id: 'wk-1',
    date: '2026-07-13',
    week_number: 1,
    planned_run_km: 10,
  } as PlanDay,
  {
    id: 'day-2',
    plan_id: 'plan-1',
    week_id: 'wk-1',
    date: '2026-07-14',
    week_number: 1,
    planned_run_km: 0,
  } as PlanDay,
];

const SESSIONS: DaySession[] = [
  {
    id: 'sess-1',
    plan_day_id: 'day-1',
    category: 'quality_run',
    distance_km: 10,
    duration_min_minutes: 55,
  } as DaySession,
  {
    id: 'sess-2',
    plan_day_id: 'day-2',
    category: 'strength_only',
    distance_km: null,
    duration_min_minutes: 40,
  } as DaySession,
];

const TODAY = new Date('2026-07-14T12:00:00Z');

function evidenceMap(): EvidenceByDay {
  return new Map<string, DayEvidence>([
    // On-plan: session-level link (onPlan true), 10.2 km.
    ['day-1', { activities: [ev({ stravaId: 1, distanceM: 10200, movingTimeS: 3000 })], onPlan: true }],
    // Off-plan: day-level link on a strength day (onPlan false), 8 km.
    ['day-2', { activities: [ev({ stravaId: 2, distanceM: 8000, movingTimeS: 2400 })], onPlan: false }],
  ]);
}

test('on-plan evidence counts volume + completion and extends the streak (DEF-L2-1)', () => {
  // A manual log on day-1 that says NOT completed with a smaller distance: linked
  // evidence must still win (precedence mirrors progress.ts) and mark the day done.
  const logs: SessionLog[] = [log({ plan_day_id: 'day-1', completed: false, actual_distance_km: 3 })];
  const { summary, heatmap } = computeStats(PLAN, WEEKS, DAYS, SESSIONS, logs, TODAY, evidenceMap());

  const jul13 = heatmap.find((c) => c.date === '2026-07-13')!;
  // Volume from evidence (10.2), NOT the log's 3: evidence precedence.
  assert.equal(jul13.completedKm, 10.2);
  assert.equal(jul13.completedMin, 50); // 3000s / 60
  assert.equal(jul13.hasLog, true); // on-plan evidence completes the session
  assert.equal(jul13.offPlan, false);

  // Completion: only the on-plan quality_run counts (the off-plan strength day
  // never completes). Both non-rest sessions are planned.
  assert.equal(summary.sessionsCompleted, 1);
  assert.equal(summary.sessionsPlanned, 2);

  // Streak: 2026-07-13's planned run is completed via on-plan evidence, so the
  // trailing streak reaches back through it (Jul 14 is a rest day, never breaks).
  assert.equal(summary.currentStreak, 2);
});

test('off-plan evidence counts volume but NOT completion (decision D2)', () => {
  const { summary, heatmap } = computeStats(PLAN, WEEKS, DAYS, SESSIONS, [], TODAY, evidenceMap());

  const jul14 = heatmap.find((c) => c.date === '2026-07-14')!;
  assert.equal(jul14.completedKm, 8); // off-plan volume colours the cell
  assert.equal(jul14.hasLog, false); // but never completes a session
  assert.equal(jul14.offPlan, true); // reads honestly as off-plan in the tooltip

  // Both days' volume is summed regardless of on/off plan (18.2 = 10.2 + 8).
  assert.equal(summary.totalCompletedKm, 18.2);
  assert.equal(summary.maxDayVolumeKm, 10.2);
  assert.equal(summary.actualMinutes, 90); // 50 (on-plan) + 40 (off-plan)
  assert.equal(summary.anyLogged, true);
});

test('without evidence, an unlinked planned run breaks the streak (control)', () => {
  // No evidence, no logs: day-1's planned run is NOT completed, so the streak does
  // not reach it. This isolates the on-plan evidence as the thing that extends it.
  const { summary, heatmap } = computeStats(PLAN, WEEKS, DAYS, SESSIONS, [], TODAY);

  const jul13 = heatmap.find((c) => c.date === '2026-07-13')!;
  assert.equal(jul13.hasLog, false);
  assert.equal(jul13.completedKm, 0);
  assert.equal(summary.sessionsCompleted, 0);
  // Only the trailing rest day (Jul 14) is on track; Jul 13's unrun session breaks it.
  assert.equal(summary.currentStreak, 1);
});

// -----------------------------------------------------------------------------
// Compact day-browser array. The dashboard's day browser reads the SAME folded
// inputs (one pass) to project every plan day to a public-safe record. The three
// evidence flags stay distinct so the widget honours D2 / D11: off-plan evidence
// reads as verified (offPlanVerified) but never completes a planned session
// (verified stays false); a manual completed log sets `logged` independently.
// -----------------------------------------------------------------------------

// Primary sessions carrying the curated prescription fields the browser shows.
const BROWSE_SESSIONS: DaySession[] = [
  {
    id: 'sess-1',
    plan_day_id: 'day-1',
    slot: 'primary',
    title: 'Threshold session',
    category: 'quality_run',
    distance_km: 10,
    pace_text: '4:30/km',
    rpe_text: '7/10',
    duration_min_minutes: 55,
  } as DaySession,
  {
    id: 'sess-2',
    plan_day_id: 'day-2',
    slot: 'primary',
    title: 'No run',
    category: 'rest',
    distance_km: null,
    duration_min_minutes: null,
  } as DaySession,
];

test('compact days project curated prescription fields in 1-based date order', () => {
  const { days } = computeStats(PLAN, WEEKS, DAYS, BROWSE_SESSIONS, [], TODAY);

  assert.equal(days.length, 2);
  const [d1, d2] = days;

  assert.equal(d1.date, '2026-07-13');
  assert.equal(d1.dayIndex, 1); // 1-based, by date order (matches the seed)
  assert.equal(d1.title, 'Threshold session');
  assert.equal(d1.category, 'quality_run');
  assert.equal(d1.distanceKm, 10);
  assert.equal(d1.paceText, '4:30/km');
  assert.equal(d1.rpeText, '7/10');

  assert.equal(d2.dayIndex, 2);
  assert.equal(d2.title, 'No run');
  assert.equal(d2.category, 'rest');
  assert.equal(d2.distanceKm, null);
});

test('compact flags: on-plan verifies, off-plan is offPlanVerified only (D11)', () => {
  const { days } = computeStats(PLAN, WEEKS, DAYS, BROWSE_SESSIONS, [], TODAY, evidenceMap());
  const byDate = new Map(days.map((d) => [d.date, d]));

  // day-1: an ON-PLAN (session-level) link completes the planned run.
  const jul13 = byDate.get('2026-07-13')!;
  assert.equal(jul13.verified, true);
  assert.equal(jul13.offPlanVerified, false);
  assert.equal(jul13.logged, false);

  // day-2: an OFF-PLAN (day-level) run on a rest day: verified stays false, but it
  // reads as off-plan verified and never completes the session (decision D2 / D11).
  const jul14 = byDate.get('2026-07-14')!;
  assert.equal(jul14.verified, false);
  assert.equal(jul14.offPlanVerified, true);
  assert.equal(jul14.logged, false);
});

test('compact flags: a completed manual log sets `logged` without a Strava link', () => {
  const logs: SessionLog[] = [log({ plan_day_id: 'day-1', completed: true, actual_distance_km: 10 })];
  const { days } = computeStats(PLAN, WEEKS, DAYS, BROWSE_SESSIONS, logs, TODAY);
  const jul13 = days.find((d) => d.date === '2026-07-13')!;

  assert.equal(jul13.logged, true); // manual completion
  assert.equal(jul13.verified, false); // no on-plan Strava link
  assert.equal(jul13.offPlanVerified, false); // no linked evidence at all
});
