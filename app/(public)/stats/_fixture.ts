// Static fixture for /stats, used only when the live database is unreachable
// (e.g. the build lane or an unconfigured env). It reuses the plan/today pins
// from the /progress fixture and synthesizes a plausible 14-week grid of plan
// days + sessions from the seeded weekly volumes, with zero logs. Zero logs is
// the genuine current state (the plan starts 2026-07-13 and nothing is logged
// yet), which drives the empty/sparse rendering path: the heatmap shows a clean
// "planned but not run" grid rather than a wall of zeros.

import type { PlanWeek, PlanDay, DaySession, SessionCategory } from '@/lib/types/database';
import { FIXTURE_PLAN, FIXTURE_TODAY } from '../progress/_fixture';

export { FIXTURE_PLAN, FIXTURE_TODAY };

const PLAN_ID = FIXTURE_PLAN.id;
const RACE_DATE = FIXTURE_PLAN.race_date!; // '2026-10-18'

const WEEK_STARTS = [
  '2026-07-13', '2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10',
  '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14',
  '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12',
];
const WEEK_ENDS = [
  '2026-07-19', '2026-07-26', '2026-08-02', '2026-08-09', '2026-08-16',
  '2026-08-23', '2026-08-30', '2026-09-06', '2026-09-13', '2026-09-20',
  '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18',
];
const PLANNED_KM = [16, 20, 25, 30, 35, 31, 40, 45, 41, 54, 57, 58, 43, 34.1];
const PHASE_LABELS = [
  'Return to normal running', 'Return to normal running', 'Return to normal running',
  'Durability and economy', 'Durability and threshold foundation', 'Durability cutback',
  'Threshold development', 'Threshold development', 'Specific-prep cutback',
  'Half-marathon development', 'Half-marathon specificity', 'Peak and race specificity',
  'Taper', 'Race week',
];

// Weekday template (0 = Mon … 6 = Sun): the category and its share of the week's
// planned volume. Monday and Friday are non-running (rest / strength) days.
const DAY_CATEGORY: SessionCategory[] = [
  'rest', 'quality_run', 'easy_run', 'easy_run', 'rest', 'long_run', 'easy_run',
];
const DAY_WEIGHT = [0, 0.18, 0.15, 0.15, 0, 0.35, 0.17];
const DAY_TITLE: Record<SessionCategory, string> = {
  rest: 'Rest',
  quality_run: 'Threshold session',
  easy_run: 'Easy run',
  long_run: 'Long run',
  bike: 'Easy bike',
  strength_only: 'Strength',
  race: 'Baystate Half Marathon',
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function daysToRace(iso: string): number {
  const [y1, m1, d1] = iso.split('-').map(Number);
  const [y2, m2, d2] = RACE_DATE.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1, 12);
  const b = Date.UTC(y2, m2 - 1, d2, 12);
  return Math.round((b - a) / 86_400_000);
}

export const FIXTURE_WEEKS: PlanWeek[] = WEEK_STARTS.map((start, i) => {
  const weekIndex = i + 1;
  return {
    id: `wk-${weekIndex}`,
    plan_id: PLAN_ID,
    phase_id: null,
    week_index: weekIndex,
    start_date: start,
    end_date: WEEK_ENDS[i],
    phase_label: PHASE_LABELS[i],
    planned_km: PLANNED_KM[i],
    range_min_km: null,
    range_max_km: null,
    previous_text: null,
    pct_change_text: null,
    run_days: null,
    long_run_km: null,
    coaching_note: null,
    performance_target: null,
    injury_target: null,
    bike_note: null,
    strength_note: null,
    is_cutback: weekIndex === 6 || weekIndex === 9,
    is_taper: weekIndex === 13,
    is_race_week: weekIndex === 14,
    is_peak: weekIndex === 12,
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  };
});

const days: PlanDay[] = [];
const sessions: DaySession[] = [];
let globalDayIndex = 0;

for (let w = 0; w < WEEK_STARTS.length; w++) {
  for (let wd = 0; wd < 7; wd++) {
    const date = addDays(WEEK_STARTS[w], wd);
    const isRace = date === RACE_DATE;
    const category: SessionCategory = isRace ? 'race' : DAY_CATEGORY[wd];
    const plannedKm = isRace
      ? FIXTURE_PLAN.race_distance_km ?? 21.1
      : round1(PLANNED_KM[w] * DAY_WEIGHT[wd]);
    const dayId = `day-${w + 1}-${wd + 1}`;

    days.push({
      id: dayId,
      plan_id: PLAN_ID,
      week_id: `wk-${w + 1}`,
      date,
      weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][wd],
      day_index: globalDayIndex,
      days_to_race: daysToRace(date),
      week_number: w + 1,
      phase_label: PHASE_LABELS[w],
      planned_run_km: plannedKm,
      cumulative_km: null,
      created_at: '2026-07-12T00:00:00Z',
      updated_at: '2026-07-12T00:00:00Z',
    });

    // Primary session: the day's headline (a run, the race, or a rest marker).
    sessions.push({
      id: `${dayId}-p`,
      plan_day_id: dayId,
      slot: 'primary',
      title: DAY_TITLE[category],
      category,
      is_quality: category === 'quality_run' || category === 'race',
      role: null,
      prescription_text: null,
      distance_km: plannedKm > 0 ? plannedKm : null,
      duration_text: null,
      duration_min_minutes: plannedKm > 0 ? Math.round(plannedKm * 5.4) : null,
      duration_max_minutes: null,
      pace_text: null,
      pace_min_s_per_km: null,
      pace_max_s_per_km: null,
      rpe_text: null,
      hr_text: null,
      terrain: null,
      cue: null,
      fuel: null,
      shoes: null,
      completion_planned: null,
      created_at: '2026-07-12T00:00:00Z',
      updated_at: '2026-07-12T00:00:00Z',
    });

    // Secondary session: the daily strength block that runs alongside the plan.
    sessions.push({
      id: `${dayId}-s`,
      plan_day_id: dayId,
      slot: 'secondary',
      title: 'Strength',
      category: 'strength_only',
      is_quality: false,
      role: null,
      prescription_text: null,
      distance_km: null,
      duration_text: null,
      duration_min_minutes: 30,
      duration_max_minutes: null,
      pace_text: null,
      pace_min_s_per_km: null,
      pace_max_s_per_km: null,
      rpe_text: null,
      hr_text: null,
      terrain: null,
      cue: null,
      fuel: null,
      shoes: null,
      completion_planned: null,
      created_at: '2026-07-12T00:00:00Z',
      updated_at: '2026-07-12T00:00:00Z',
    });

    globalDayIndex += 1;
  }
}

export const FIXTURE_DAYS: PlanDay[] = days;
export const FIXTURE_SESSIONS: DaySession[] = sessions;
