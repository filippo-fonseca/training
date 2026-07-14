// Static fixture for /milestones, derived verbatim from supabase/seed.sql (plan
// baystate-2026): 9 milestones + 4 traffic-light checkpoints. Used only when the
// live database is unreachable. FIXTURE_TODAY is the plan's first day, so the
// timeline renders every entry as upcoming (the genuine pre-race state).

import type { Plan, Milestone, Checkpoint } from "@/lib/db";

export const FIXTURE_TODAY = "2026-07-13";

/** Week-end ISO dates by week index (1-based), for placing checkpoints. */
export const FIXTURE_WEEK_ENDS = [
  "2026-07-19", "2026-07-26", "2026-08-02", "2026-08-09", "2026-08-16",
  "2026-08-23", "2026-08-30", "2026-09-06", "2026-09-13", "2026-09-20",
  "2026-09-27", "2026-10-04", "2026-10-11", "2026-10-18",
];

const PLAN_ID = "410445c8-ed26-5234-9c12-1427b05b452a";
const T = "2026-07-12T00:00:00Z";

function milestone(
  index: number,
  type: Milestone["type"],
  title: string,
  date: string | null,
  week: number | null,
  description: string,
  green: string | null = null,
  yellow: string | null = null,
  red: string | null = null,
): Milestone {
  return {
    id: `fixture-milestone-${index}`,
    plan_id: PLAN_ID,
    milestone_index: index,
    type,
    title,
    date,
    week_number: week,
    description,
    green_criteria: green,
    yellow_criteria: yellow,
    red_criteria: red,
    created_at: T,
    updated_at: T,
  };
}

export const FIXTURE_MILESTONES: Milestone[] = [
  milestone(1, "cutback_week", "Week 6 cutback (31 km)", null, 6,
    "Durability cutback: volume steps back to 31 km to absorb the prior block."),
  milestone(2, "cutback_week", "Week 9 cutback (41 km)", null, 9,
    "Specific-prep cutback before half-marathon development weeks."),
  milestone(3, "gated_long_run", "First full-distance run (21.1 km easy confidence run)", "2026-09-20", 10,
    "Planned race-distance familiarity run; pace adds no value and symptoms cancel it.",
    "21.1 km entirely easy.", "16-18 km easy.", "No run."),
  milestone(4, "key_workout", "Peak HM-specific session (2x4 km @ HM effort)", "2026-09-29", 12,
    "The peak race-specificity workout; controlled at RPE 7-8."),
  milestone(5, "gated_long_run", "Conditional second long run (20 km)", "2026-10-04", 12,
    "Optional, not owed. Proceeds only if all prior gates and metrics stay green.",
    "20.0 km easy; optional final 3 km steady only if all green at 17 km.", "18 km entirely easy.",
    "No run / symptom-free bike only."),
  milestone(6, "taper_start", "Taper start (Week 13)", "2026-10-05", 13,
    "Volume drops while brief intensity and rhythm are preserved."),
  milestone(7, "key_workout", "Race-rhythm tune-up (3x800 m @ HM)", "2026-10-13", 14,
    "Final sharpening touch in race week."),
  milestone(8, "race", "Baystate Half Marathon", "2026-10-18", 14,
    "Race day, 8:00 AM start. The only race; no tune-up races."),
  milestone(9, "post_race", "Post-race recovery + marathon bridge", "2026-10-18", 14,
    "72 h / days 4-7 / week 2 recovery protocol, then winter-base entry criteria toward a spring 2027 marathon (BQ.2, April 11, 2027)."),
];

function checkpoint(
  index: number,
  title: string,
  afterWeek: number,
  green: string,
  yellow: string,
  red: string,
): Checkpoint {
  return {
    id: `fixture-checkpoint-${index}`,
    plan_id: PLAN_ID,
    checkpoint_index: index,
    title,
    after_week: afterWeek,
    green_action: green,
    yellow_action: yellow,
    red_action: red,
    created_at: T,
    updated_at: T,
  };
}

export const FIXTURE_CHECKPOINTS: Checkpoint[] = [
  checkpoint(1, "Early August - after Week 3", 3,
    "Five run days tolerated, no next-morning increase, strides relaxed -> begin controlled fartlek.",
    "Repeat Week 3 at 20-25 km and keep bike threshold.",
    "Return to prior tolerable run exposure and clinical review."),
  checkpoint(2, "Late August - after Week 7", 7,
    "40 km, 14 km long run, threshold, and strength all absorbed -> progress.",
    "Repeat 34-40 km or insert another cutback; remove strides/steady finish first.",
    "Stop quality and reassess."),
  checkpoint(3, "Mid-September - after Week 9", 9,
    "16 km long run and threshold stable -> allow Week 10's 21.1 km easy gate.",
    "Cap long run at 16-18 km; sub-1:22 remains provisional.",
    "No full-distance run and clinician reassessment."),
  checkpoint(4, "Early October - after Week 12", 12,
    "2x4 km HM effort controlled, recovery normal, symptoms stable -> choose A/B/C and taper as written.",
    "B/C goal, remove optional steady work, reduce Week 13.",
    "No performance target; consider not racing."),
];

export const FIXTURE_PLAN: Plan = {
  id: PLAN_ID,
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
  created_at: T,
  updated_at: T,
};
