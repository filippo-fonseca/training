// Static fixture for /progress, derived verbatim from supabase/seed.sql (plan
// baystate-2026). Used only when the live database is unreachable. Logs are
// empty, the genuine current state, since the plan starts 2026-07-13 and no
// sessions have been logged. This drives the empty/partial-data rendering path.

import type { Plan } from "@/lib/db";
import type { WeeklyKm } from "@/lib/db/progress";
import type { PhaseBand } from "./_data";

/** Pinned "today" for deterministic fixture rendering: the plan's first day. */
export const FIXTURE_TODAY = "2026-07-13";

const WEEK_STARTS = [
  "2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10",
  "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14",
  "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12",
];
const WEEK_ENDS = [
  "2026-07-19", "2026-07-26", "2026-08-02", "2026-08-09", "2026-08-16",
  "2026-08-23", "2026-08-30", "2026-09-06", "2026-09-13", "2026-09-20",
  "2026-09-27", "2026-10-04", "2026-10-11", "2026-10-18",
];
const PLANNED = [16, 20, 25, 30, 35, 31, 40, 45, 41, 54, 57, 58, 43, 34.1];
const PHASE_LABELS = [
  "Return to normal running", "Return to normal running", "Return to normal running",
  "Durability and economy", "Durability and threshold foundation", "Durability cutback",
  "Threshold development", "Threshold development", "Specific-prep cutback",
  "Half-marathon development", "Half-marathon specificity", "Peak and race specificity",
  "Taper", "Race week",
];

export const FIXTURE_WEEKLY: WeeklyKm[] = PLANNED.map((planned, i) => {
  const weekIndex = i + 1;
  return {
    weekIndex,
    startDate: WEEK_STARTS[i],
    endDate: WEEK_ENDS[i],
    phaseLabel: PHASE_LABELS[i],
    plannedKm: planned,
    actualKm: null, // no logs yet: the empty state
    loggedDays: 0,
    isCutback: weekIndex === 6 || weekIndex === 9,
    isTaper: weekIndex === 13,
    isRaceWeek: weekIndex === 14,
    isPeak: weekIndex === 12,
  };
});

export const FIXTURE_PHASE_BANDS: PhaseBand[] = [
  { name: "Return to running", startWeek: 1, endWeek: 3 },
  { name: "Durability", startWeek: 4, endWeek: 4 },
  { name: "Threshold base", startWeek: 5, endWeek: 5 },
  { name: "Cutback", startWeek: 6, endWeek: 6 },
  { name: "Threshold dev", startWeek: 7, endWeek: 8 },
  { name: "Cutback", startWeek: 9, endWeek: 9 },
  { name: "HM development", startWeek: 10, endWeek: 10 },
  { name: "HM specificity", startWeek: 11, endWeek: 11 },
  { name: "Peak", startWeek: 12, endWeek: 12 },
  { name: "Taper", startWeek: 13, endWeek: 13 },
  { name: "Race", startWeek: 14, endWeek: 14 },
];

export const FIXTURE_PLAN: Plan = {
  id: "410445c8-ed26-5234-9c12-1427b05b452a",
  slug: "baystate-2026",
  title: "Baystate 2026 - Filippo's 14-week return-to-performance plan",
  version: 1,
  prepared_on: "2026-07-12",
  status: "active",
  athlete_name: "Filippo",
  athlete_age: 20,
  race_name: "Baystate Half Marathon",
  race_distance_km: 21.1,
  race_date: "2026-10-18",
  race_start_time: "08:00:00",
  race_location: "Lowell, MA",
  race_course_notes: null,
  start_date: "2026-07-13",
  end_date: "2026-10-18",
  total_planned_km: 529.1,
  north_star: null,
  plan_logic: null,
  goal_a: "sub-1:22",
  goal_b: "PR under 1:23:30",
  goal_c: "healthy controlled race",
  created_at: "2026-07-12T00:00:00Z",
  updated_at: "2026-07-12T00:00:00Z",
};
