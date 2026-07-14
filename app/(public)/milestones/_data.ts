// Server-side data loader for /milestones. Reads the plan, its milestones and
// traffic-light checkpoints, and week windows (to place checkpoints on a date)
// via lib/db anon helpers. Falls back to a seed-derived fixture when the live
// database is unreachable (e.g. the build lane). The timeline reads as a
// journey: past dimmed, today marked, future expectant, with the race as the
// terminus.

import {
  createSupabaseClient,
  getPlan,
  getMilestones,
  getCheckpoints,
  getWeeks,
  type Plan,
  type Milestone,
  type Checkpoint,
  type PlanWeek,
} from "@/lib/db";
import {
  FIXTURE_PLAN,
  FIXTURE_MILESTONES,
  FIXTURE_CHECKPOINTS,
  FIXTURE_WEEK_ENDS,
  FIXTURE_TODAY,
} from "./_fixture";

export type TimelineStatus = "passed" | "current" | "upcoming";

export interface TimelineEntry {
  key: string;
  kind: "milestone" | "checkpoint";
  title: string;
  /** ISO date used for ordering + status; may be a checkpoint's week-end date. */
  date: string | null;
  /** Human date label (e.g. "Sun, Oct 18") or a fallback like "after Week 3". */
  dateLabel: string;
  status: TimelineStatus;
  isRace: boolean;
  description: string | null;
  weekNumber: number | null;
  /** Milestone type (decision_checkpoint, gated_long_run, race, ...) if a milestone. */
  milestoneType: Milestone["type"] | null;
  /** Traffic-light criteria, present on gated milestones and checkpoints. */
  green: string | null;
  yellow: string | null;
  red: string | null;
}

export interface MilestonesData {
  plan: Plan;
  entries: TimelineEntry[];
  todayIso: string;
  fromFixture: boolean;
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

function dateLabel(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function statusFor(iso: string | null, todayIso: string): TimelineStatus {
  if (!iso) return "upcoming";
  if (iso < todayIso) return "passed";
  if (iso === todayIso) return "current";
  return "upcoming";
}

/**
 * Fold milestones + checkpoints into one date-ordered timeline. Checkpoints are
 * placed at the end date of the week they follow (after_week), so they interleave
 * with milestones chronologically. The race milestone is flagged as the terminus.
 */
export function buildTimeline(
  milestones: Milestone[],
  checkpoints: Checkpoint[],
  weekEndByIndex: Map<number, string>,
  todayIso: string,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const m of milestones) {
    const iso = m.date;
    entries.push({
      key: `m-${m.id}`,
      kind: "milestone",
      title: m.title,
      date: iso,
      dateLabel: dateLabel(iso, m.week_number ? `Week ${m.week_number}` : "Date TBD"),
      status: statusFor(iso, todayIso),
      isRace: m.type === "race",
      description: m.description,
      weekNumber: m.week_number,
      milestoneType: m.type,
      green: m.green_criteria,
      yellow: m.yellow_criteria,
      red: m.red_criteria,
    });
  }

  for (const c of checkpoints) {
    const iso = c.after_week != null ? (weekEndByIndex.get(c.after_week) ?? null) : null;
    entries.push({
      key: `c-${c.id}`,
      kind: "checkpoint",
      title: c.title,
      date: iso,
      dateLabel: dateLabel(iso, c.after_week ? `after Week ${c.after_week}` : "Checkpoint"),
      status: statusFor(iso, todayIso),
      isRace: false,
      description: null,
      weekNumber: c.after_week,
      milestoneType: null,
      green: c.green_action,
      yellow: c.yellow_action,
      red: c.red_action,
    });
  }

  // Chronological order; nulls last. The race sorts to the terminus by its date.
  return entries.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : rankTie(a, b);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}

// On a shared date, checkpoints (a week's verdict) precede that day's milestone,
// and the race/post-race sort last.
function rankTie(a: TimelineEntry, b: TimelineEntry): number {
  const rank = (e: TimelineEntry) =>
    e.milestoneType === "post_race" ? 3 : e.isRace ? 2 : e.kind === "milestone" ? 1 : 0;
  return rank(a) - rank(b);
}

function fixtureData(): MilestonesData {
  const weekEndByIndex = new Map<number, string>(
    FIXTURE_WEEK_ENDS.map((end, i) => [i + 1, end]),
  );
  return {
    plan: FIXTURE_PLAN,
    entries: buildTimeline(FIXTURE_MILESTONES, FIXTURE_CHECKPOINTS, weekEndByIndex, FIXTURE_TODAY),
    todayIso: FIXTURE_TODAY,
    fromFixture: true,
  };
}

export async function loadMilestones(): Promise<MilestonesData> {
  const client = anonClient();
  if (!client) return fixtureData();

  try {
    const plan = await getPlan(client);
    const [milestones, checkpoints, weeks] = await Promise.all([
      getMilestones(client, plan.id),
      getCheckpoints(client, plan.id),
      getWeeks(client, plan.id),
    ]);
    const weekEndByIndex = new Map<number, string>();
    for (const w of weeks as PlanWeek[]) {
      if (w.end_date) weekEndByIndex.set(w.week_index, w.end_date);
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    return {
      plan,
      entries: buildTimeline(milestones, checkpoints, weekEndByIndex, todayIso),
      todayIso,
      fromFixture: false,
    };
  } catch {
    return fixtureData();
  }
}
