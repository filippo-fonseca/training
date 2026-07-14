import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlanDay, DaySession, SessionLog } from '@/lib/db';
import type { ActivityEvidence, DayEvidence } from '@/lib/derive';
import { computeView, type JourneyBundle, type PublicPlan } from './journey-model';
import { buildTodayPayload, deriveStatus } from '@/app/api/public/_lib/payload';

// Regression for DEF-1 (sealed decision D2): off-plan (day-level) evidence must
// never mark today's planned session done, on the landing card (todayActual) or
// in the public API payload (status). It still counts as weekly logged volume.

const TODAY = '2026-07-14';

const plan: PublicPlan = {
  id: 'plan-1',
  slug: 'baystate-2026',
  title: 'Baystate 2026',
  status: 'active',
  race_name: 'Baystate Half',
  race_distance_km: 21.1,
  race_date: '2026-10-18',
  race_location: null,
  start_date: '2026-07-13',
  end_date: '2026-10-18',
  north_star: null,
};

function day(partial: Partial<PlanDay>): PlanDay {
  return {
    id: 'day-1',
    date: TODAY,
    planned_run_km: 0,
    ...partial,
  } as PlanDay;
}

function sess(partial: Partial<DaySession>): DaySession {
  return {
    id: 'sess-1',
    plan_day_id: 'day-1',
    slot: 'primary',
    title: 'Session',
    category: 'bike',
    ...partial,
  } as DaySession;
}

function evidence(partial: Partial<ActivityEvidence>): ActivityEvidence {
  return {
    stravaId: 1,
    name: 'Evening run',
    photoUrl: null,
    distanceM: 10000,
    movingTimeS: 3000,
    elapsedTimeS: 3100,
    startDate: `${TODAY}T23:00:00Z`,
    sportType: 'Run',
    activityUrl: 'https://www.strava.com/activities/1',
    ...partial,
  };
}

function bundle(overrides: {
  primary?: DaySession;
  evidence?: DayEvidence;
  log?: SessionLog | null;
  plannedRunKm?: number;
}): JourneyBundle {
  const d = day({ planned_run_km: overrides.plannedRunKm ?? 0 });
  return {
    plan,
    phases: [],
    weeks: [],
    milestones: [],
    todayDetail: {
      day: d,
      sessions: [overrides.primary ?? sess({})],
      alternatives: [],
    },
    weekDays: [d],
    logsByDayId: overrides.log ? { [d.id]: overrides.log } : {},
    evidenceByDayId: overrides.evidence ? { [d.id]: overrides.evidence } : {},
    source: 'fixture',
  };
}

test('DEF-1: an off-plan run on a bike day never reads as done/logged', () => {
  const view = computeView(
    bundle({
      primary: sess({ category: 'bike' }),
      evidence: { activities: [evidence({})], onPlan: false },
    }),
    TODAY,
  );
  // Landing card: no "Done, verified" from off-plan evidence.
  assert.equal(view.todayActual.done, false);
  assert.notEqual(view.todayActual.source, 'strava');
  // Public API payload: the planned bike session is still just "planned".
  assert.equal(deriveStatus(view), 'planned');
  assert.equal(buildTodayPayload(view).status, 'planned');
  // The off-plan run still surfaces as weekly logged volume (10 km).
  assert.equal(view.week.loggedKm, 10);
  // And the evidence itself is still visible on the view.
  assert.equal(view.todayEvidence.length, 1);
});

test('on-plan (session-level) evidence marks today done and publicly logged', () => {
  const view = computeView(
    bundle({
      primary: sess({ category: 'easy_run' }),
      evidence: { activities: [evidence({})], onPlan: true },
      plannedRunKm: 8, // a planned run, so the day is not a rest day
    }),
    TODAY,
  );
  assert.equal(view.todayActual.done, true);
  assert.equal(view.todayActual.source, 'strava');
  assert.equal(buildTodayPayload(view).status, 'logged');
});

test('a strength day with off-plan evidence and no log stays un-done', () => {
  const view = computeView(
    bundle({
      primary: sess({ category: 'strength_only' }),
      evidence: { activities: [evidence({ distanceM: 5000 })], onPlan: false },
    }),
    TODAY,
  );
  assert.equal(view.todayActual.done, false);
  assert.equal(deriveStatus(view), 'planned');
  assert.equal(view.week.loggedKm, 5);
});
