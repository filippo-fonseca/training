// Server-side data loader for /progress. Reads the plan, weekly planned-vs-actual
// km, cumulative series, phase bands, and progress summary via the anon lib/db
// helpers. If the hosted database is unreachable or its env is missing (e.g. the
// build lane), it falls back to a static fixture derived from supabase/seed.sql
// with zero logs, which is also the genuine current state (the plan starts
// 2026-07-13 and no sessions are logged yet), satisfying the empty-data criterion.

import {
  createSupabaseClient,
  getPlan,
  getPhases,
  getWeeklyKm,
  getCumulativeKm,
  getProgressSummary,
  computeCumulative,
  computeProgressSummary,
  type Plan,
  type WeeklyKm,
  type CumulativePoint,
  type ProgressSummary,
} from "@/lib/db";
import {
  FIXTURE_PLAN,
  FIXTURE_WEEKLY,
  FIXTURE_PHASE_BANDS,
  FIXTURE_TODAY,
} from "./_fixture";

export interface PhaseBand {
  name: string;
  startWeek: number;
  endWeek: number;
}

export interface ProgressData {
  plan: Plan;
  weekly: WeeklyKm[];
  cumulative: CumulativePoint[];
  phases: PhaseBand[];
  summary: ProgressSummary;
  currentWeek: number | null;
  /** True when served from the static fixture rather than the live database. */
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

/** Which 1-based week contains `today`, or null if outside the plan window. */
export function weekForDate(weekly: WeeklyKm[], todayIso: string): number | null {
  for (const w of weekly) {
    if (w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate) {
      return w.weekIndex;
    }
  }
  return null;
}

function fixtureData(): ProgressData {
  const cumulative = computeCumulative(FIXTURE_WEEKLY);
  const summary = computeProgressSummary(FIXTURE_WEEKLY, [], [], new Date(FIXTURE_TODAY));
  return {
    plan: FIXTURE_PLAN,
    weekly: FIXTURE_WEEKLY,
    cumulative,
    phases: FIXTURE_PHASE_BANDS,
    summary,
    currentWeek: weekForDate(FIXTURE_WEEKLY, FIXTURE_TODAY),
    fromFixture: true,
  };
}

export async function loadProgress(): Promise<ProgressData> {
  const client = anonClient();
  if (!client) return fixtureData();

  try {
    const plan = await getPlan(client);
    const [weekly, cumulative, phases, summary] = await Promise.all([
      getWeeklyKm(client, plan.id),
      getCumulativeKm(client, plan.id),
      getPhases(client, plan.id),
      getProgressSummary(client, plan.id),
    ]);
    // A plan always has weeks; an empty series means the seed has not landed yet.
    if (weekly.length === 0) return fixtureData();
    const todayIso = new Date().toISOString().slice(0, 10);
    return {
      plan,
      weekly,
      cumulative,
      phases: phases
        .filter((p) => p.start_week != null && p.end_week != null)
        .map((p) => ({ name: p.name, startWeek: p.start_week!, endWeek: p.end_week! })),
      summary,
      currentWeek: weekForDate(weekly, todayIso),
      fromFixture: false,
    };
  } catch {
    return fixtureData();
  }
}
