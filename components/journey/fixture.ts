/**
 * Local development fixture — a faithful snapshot of the seeded Baystate 2026
 * plan at its opening day (2026-07-13, Week 1, day 1 of 98). This is the
 * graceful fallback the public journey renders when the live Supabase project
 * is unreachable or not yet seeded (per the Conductor seed). It mirrors
 * supabase/seed.sql so the page looks identical to production once the seed is
 * applied. Values are hand-copied from the seed; the pre-log state (no session
 * logs on day one) is the real state, not a placeholder.
 */
import type {
  Plan,
  PlanPhase,
  PlanWeek,
  PlanDay,
  DaySession,
  Milestone,
} from "@/lib/db";
import type { JourneyBundle } from "./journey-model";

const PLAN_ID = "410445c8-ed26-5234-9c12-1427b05b452a";
const WEEK1_ID = "7bdbc2ff-75c8-51d2-b2af-366876b3c95d";
const DAY1_ID = "3c55771e-5e48-554e-8304-7245af777d54";
const TS = "2026-07-12T12:00:00+00:00";

const plan: Plan = {
  id: PLAN_ID,
  slug: "baystate-2026",
  title: "Baystate 2026 - Filippo's 14-week return-to-performance plan",
  version: 1,
  prepared_on: "2026-07-12",
  status: "active",
  athlete_name: "Filippo",
  athlete_age: 20,
  athlete_notes:
    "Returning from probable patellofemoral pain (left knee) plus prior right-foot/plantar and calf issues. Previous HM PR 1:23:30; recorded HR max ~202 bpm.",
  race_name: "Baystate Half Marathon",
  race_distance_km: 21.1,
  race_date: "2026-10-18",
  race_start_time: "08:00:00",
  race_location: "Lowell, MA",
  race_course_notes:
    "Official flat, paved double loop using the Rourke and Aiken Street bridges; shared no-wave start with the marathon.",
  start_date: "2026-07-13",
  end_date: "2026-10-18",
  total_planned_km: 529.1,
  north_star:
    "Rebuild running-specific durability first, then convert preserved aerobic fitness into a genuine PR attempt, without letting fast-returning fitness outrun tissue tolerance.",
  plan_logic:
    "Four separated easy runs, then five-day frequency, controlled threshold, full-distance easy tolerance, broken HM-specific work, a reduced-volume taper, and an evidence-based A/B/C race choice.",
  medical_notes: null,
  goal_a: "sub-1:22 only if peak HM-specific work is controlled at RPE 7-8 and recovery is green.",
  goal_b: "clear PR under 1:23:30 if work supports ~3:57/km.",
  goal_c: "healthy controlled race if symptoms, weather, or fitness evidence is mixed.",
  created_at: TS,
  updated_at: TS,
};

const PHASE_ROWS: Array<[string, number, number]> = [
  ["Return to normal running", 1, 3],
  ["Durability and economy", 4, 4],
  ["Durability and threshold foundation", 5, 5],
  ["Durability cutback", 6, 6],
  ["Threshold development", 7, 8],
  ["Specific-prep cutback", 9, 9],
  ["Half-marathon development", 10, 10],
  ["Half-marathon specificity", 11, 11],
  ["Peak and race specificity", 12, 12],
  ["Taper", 13, 13],
  ["Race week", 14, 14],
];
const phases: PlanPhase[] = PHASE_ROWS.map(([name, start, end], i) => ({
  id: `fixture-phase-${i + 1}`,
  plan_id: PLAN_ID,
  phase_index: i + 1,
  name,
  start_week: start,
  end_week: end,
  description: null,
  created_at: TS,
  updated_at: TS,
}));

/** Week start dates are 7-day steps from the plan start (Mon 2026-07-13). */
function weekDates(index: number): [string, string] {
  const base = Date.UTC(2026, 6, 13); // 2026-07-13
  const start = base + (index - 1) * 7 * 86_400_000;
  const end = start + 6 * 86_400_000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return [iso(start), iso(end)];
}

const PLANNED_KM = [16, 20, 25, 30, 35, 31, 40, 45, 41, 54, 57, 58, 43, 34.1];
const LONG_RUN_KM = [5.2, 7, 8, 10, 12, 9, 14, 16, 13, 21.1, 18, 20, 14, 21.1];
const PHASE_LABEL_BY_WEEK = [
  "Return to normal running",
  "Return to normal running",
  "Return to normal running",
  "Durability and economy",
  "Durability and threshold foundation",
  "Durability cutback",
  "Threshold development",
  "Threshold development",
  "Specific-prep cutback",
  "Half-marathon development",
  "Half-marathon specificity",
  "Peak and race specificity",
  "Taper",
  "Race week",
];

function mkWeek(index: number, overrides: Partial<PlanWeek> = {}): PlanWeek {
  const [start_date, end_date] = weekDates(index);
  return {
    id: index === 1 ? WEEK1_ID : `fixture-week-${index}`,
    plan_id: PLAN_ID,
    phase_id: null,
    week_index: index,
    start_date,
    end_date,
    phase_label: PHASE_LABEL_BY_WEEK[index - 1],
    planned_km: PLANNED_KM[index - 1],
    range_min_km: null,
    range_max_km: null,
    previous_text: null,
    pct_change_text: null,
    run_days: null,
    long_run_km: LONG_RUN_KM[index - 1],
    coaching_note: null,
    performance_target: null,
    injury_target: null,
    bike_note: null,
    strength_note: null,
    is_cutback: index === 6 || index === 9,
    is_taper: index === 13,
    is_race_week: index === 14,
    is_peak: index === 12,
    created_at: TS,
    updated_at: TS,
    ...overrides,
  };
}

const weeks: PlanWeek[] = Array.from({ length: 14 }, (_, i) => mkWeek(i + 1));
// Week 1 carries the full seeded detail (the current week we render).
weeks[0] = mkWeek(1, {
  range_min_km: 12,
  range_max_km: 16,
  previous_text: "rehab",
  pct_change_text: "baseline",
  run_days: 4,
  coaching_note:
    "This week is a bridge out of Level 5, not a fitness test. Four separated runs keep each exposure modest and the total below the failed 20 km return. Aerobic ambition stays on the bike; every run ends with the sense that more was available.",
  performance_target: "Restore relaxed continuous running and routine.",
  injury_target:
    "Prove that 3.2-5.2 km exposures leave stairs and the next morning unchanged.",
});

// Week 1 days. Run days: Mon 3.2, Wed 4.0, Fri 3.6, Sun 5.2 (16 km total).
const WEEK1_RUN_KM = [3.2, 0, 4.0, 0, 3.6, 0, 5.2];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let cumulative = 0;
const weekDays: PlanDay[] = WEEK1_RUN_KM.map((km, i) => {
  cumulative += km;
  const date = new Date(Date.UTC(2026, 6, 13) + i * 86_400_000).toISOString().slice(0, 10);
  return {
    id: i === 0 ? DAY1_ID : `fixture-day-${i + 1}`,
    plan_id: PLAN_ID,
    week_id: WEEK1_ID,
    date,
    weekday: WEEKDAYS[i],
    day_index: i + 1,
    days_to_race: 97 - i,
    week_number: 1,
    phase_label: "Return to normal running",
    planned_run_km: km,
    cumulative_km: Math.round(cumulative * 10) / 10,
    created_at: TS,
    updated_at: TS,
  };
});

const day1 = weekDays[0];

const day1Primary: DaySession = {
  id: "7c6f801b-6d7b-5a2b-9fe4-8ffc4b156294",
  plan_day_id: DAY1_ID,
  slot: "primary",
  title: "Easy return run",
  category: "easy_run",
  is_quality: false,
  role:
    "The first run after Level 5 repeats the known continuous distance. It establishes a clean baseline after travel and keeps the first exposure deliberately unremarkable.",
  prescription_text:
    "5 min brisk walk + ankle rocks; run 3.2 km continuously easy; walk 5 min to cool down.",
  distance_km: 3.2,
  duration_text: "25-32 min plus walk",
  duration_min_minutes: 25,
  duration_max_minutes: 32,
  pace_text: "5:05-5:40/km",
  pace_min_s_per_km: 305,
  pace_max_s_per_km: 340,
  rpe_text: "2/10",
  hr_text: "usually 135-158 bpm; conversation and RPE govern",
  terrain: "Flat, predictable path or treadmill; no hills.",
  cue: "Tall posture, short relaxed stride, quiet feet.",
  fuel: "Normal meal timing; water to thirst.",
  shoes: "Familiar cushioned daily trainer; shoe used: ______",
  completion_planned: "distance 3.2 km; pace 5:05-5:40/km; RPE 2/10",
  created_at: TS,
  updated_at: TS,
};

const day1Secondary: DaySession = {
  id: "9935a596-f46e-5563-91cf-4252c037fb87",
  plan_day_id: DAY1_ID,
  slot: "secondary",
  title: "Upper A",
  category: null,
  is_quality: false,
  role: null,
  prescription_text:
    "Upper A - bench press 3x5-8; chest-supported row 3x6-10; incline DB press 2x8-12; pulldown 2x8-12; optional arms 2x10-15. RPE 7, 2-3 reps in reserve.",
  distance_km: null,
  duration_text: null,
  duration_min_minutes: null,
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
  created_at: TS,
  updated_at: TS,
};

function mkMilestone(
  index: number,
  type: Milestone["type"],
  title: string,
  date: string | null,
  week_number: number | null,
  description: string | null,
): Milestone {
  return {
    id: `fixture-milestone-${index}`,
    plan_id: PLAN_ID,
    milestone_index: index,
    type,
    title,
    date,
    week_number,
    description,
    green_criteria: null,
    yellow_criteria: null,
    red_criteria: null,
    created_at: TS,
    updated_at: TS,
  };
}

const milestones: Milestone[] = [
  mkMilestone(1, "cutback_week", "Week 6 cutback (31 km)", null, 6, "Durability cutback: volume steps back to 31 km to absorb the prior block."),
  mkMilestone(2, "cutback_week", "Week 9 cutback (41 km)", null, 9, "Specific-prep cutback before half-marathon development weeks."),
  mkMilestone(3, "gated_long_run", "First full-distance run (21.1 km easy confidence run)", "2026-09-20", 10, "Planned race-distance familiarity run; pace adds no value and symptoms cancel it."),
  mkMilestone(4, "key_workout", "Peak HM-specific session (2x4 km @ HM effort)", "2026-09-29", 12, "The peak race-specificity workout; controlled at RPE 7-8."),
  mkMilestone(5, "gated_long_run", "Conditional second long run (20 km)", "2026-10-04", 12, "Optional, not owed. Proceeds only if all prior gates and metrics stay green."),
  mkMilestone(6, "taper_start", "Taper start (Week 13)", "2026-10-05", 13, "Volume drops while brief intensity and rhythm are preserved."),
  mkMilestone(7, "key_workout", "Race-rhythm tune-up (3x800 m @ HM)", "2026-10-13", 14, "Final sharpening touch in race week."),
  mkMilestone(8, "race", "Baystate Half Marathon", "2026-10-18", 14, "Race day, 8:00 AM start. The only race; no tune-up races."),
  mkMilestone(9, "post_race", "Post-race recovery + marathon bridge", "2026-10-18", 14, "72 h / days 4-7 / week 2 recovery protocol, then winter-base entry criteria toward a spring 2027 marathon."),
];

/** The full day-one bundle, ready for computeView. */
export function fixtureBundle(): JourneyBundle {
  return {
    plan,
    phases,
    weeks,
    milestones,
    todayDetail: {
      day: day1,
      sessions: [day1Primary, day1Secondary],
      alternatives: [],
    },
    weekDays,
    logsByDayId: {}, // pre-log: no sessions logged on opening day
    source: "fixture",
  };
}
