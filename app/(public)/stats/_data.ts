// Server-side data loader for /stats. Reads the plan, then folds weeks, days,
// sessions, and logs into the stats summary + heatmap via the anon lib/db
// helpers. If the hosted database is unreachable or its env is missing (e.g. the
// build lane), it falls back to a static fixture derived from supabase/seed.sql
// with zero logs, which is also the genuine current state (the plan starts
// 2026-07-13 and no sessions are logged yet). Public-safe throughout: only
// curated plan/session/log fields are read, never health data or private notes.

import {
  createSupabaseClient,
  getPlan,
  getStats,
  computeStats,
  type Plan,
  type StatsData,
} from '@/lib/db';
import { todayInNewYork } from '@/components/calendar/date-utils';
import {
  FIXTURE_PLAN,
  FIXTURE_TODAY,
  FIXTURE_WEEKS,
  FIXTURE_DAYS,
  FIXTURE_SESSIONS,
} from './_fixture';

export interface StatsPageData {
  plan: Plan;
  summary: StatsData['summary'];
  heatmap: StatsData['heatmap'];
  /** Every plan day as a compact browsing record (feeds the dashboard day browser). */
  days: StatsData['days'];
  /** Today as an ISO date string ('YYYY-MM-DD'); pins the heatmap's today ring. */
  today: string;
  /** True when served from the static fixture rather than the live database. */
  fromFixture: boolean;
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    return createSupabaseClient(url, key);
  } catch {
    return null;
  }
}

/** A UTC-noon Date whose calendar date equals `iso`, safe to feed the reducer. */
function noonUtc(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function fixtureData(): StatsPageData {
  const { summary, heatmap, days } = computeStats(
    FIXTURE_PLAN,
    FIXTURE_WEEKS,
    FIXTURE_DAYS,
    FIXTURE_SESSIONS,
    [],
    noonUtc(FIXTURE_TODAY),
  );
  return { plan: FIXTURE_PLAN, summary, heatmap, days, today: FIXTURE_TODAY, fromFixture: true };
}

export async function loadStats(): Promise<StatsPageData> {
  const client = anonClient();
  if (!client) return fixtureData();

  try {
    const plan = await getPlan(client);
    const todayIso = todayInNewYork();
    const { summary, heatmap, days } = await getStats(client, plan, noonUtc(todayIso));
    // A plan always has days; an empty grid means the seed has not landed yet.
    if (heatmap.length === 0) return fixtureData();
    return { plan, summary, heatmap, days, today: todayIso, fromFixture: false };
  } catch {
    return fixtureData();
  }
}
