/**
 * Server-only data access for the public journey. Reads live plan data from
 * Supabase through @/lib/db as the anon (RLS-protected) role and never touches
 * the service key. If the database is unreachable, misconfigured, or not yet
 * seeded, it falls back to the local fixture so the page always renders — the
 * fallback is logged, never silent.
 */
import {
  createSupabaseClient,
  getPlan,
  getPhases,
  getWeeks,
  getMilestones,
  getLogsForPlan,
  getWeekWithDays,
  getDay,
  type TypedSupabaseClient,
  type PlanDay,
  type SessionLog,
  type DayDetail,
} from "@/lib/db";
import {
  computeView,
  findCurrentWeek,
  toPublicPlan,
  type JourneyBundle,
  type JourneyView,
} from "./journey-model";
import { fixtureBundle } from "./fixture";
import { RACE_TIMEZONE, todayInZone } from "./journey-time";

/** Build an anon Supabase client from the public env, or null if unconfigured. */
function anonClient(): TypedSupabaseClient | null {
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

async function loadBundle(todayISO: string): Promise<JourneyBundle> {
  const client = anonClient();
  if (!client) return fixtureBundle();

  try {
    // getPlan does `select('*')` and returns the full row, including clinical
    // fields (medical_notes, athlete_notes) that must never reach an
    // anonymous client. Project to the public-safe subset immediately, before
    // anything derived from `plan` can cross into the view model / RSC payload.
    const rawPlan = await getPlan(client);
    const plan = toPublicPlan(rawPlan);
    const [phases, weeks, milestones, logs] = await Promise.all([
      getPhases(client, rawPlan.id),
      getWeeks(client, rawPlan.id),
      getMilestones(client, rawPlan.id),
      getLogsForPlan(client, rawPlan.id),
    ]);

    // Days of the week that contains today, for the weekly snapshot.
    let weekDays: PlanDay[] = [];
    const current = findCurrentWeek(weeks, todayISO);
    if (current) {
      const wd = await getWeekWithDays(client, plan.id, current.week_index);
      weekDays = wd.days;
    }

    // Today's day + sessions. getDay throws when today has no plan day
    // (before the plan starts or after the race); that is a valid empty state.
    let todayDetail: DayDetail | null = null;
    try {
      todayDetail = await getDay(client, plan.id, todayISO);
    } catch {
      todayDetail = null;
    }

    const logsByDayId: Record<string, SessionLog> = {};
    for (const l of logs) logsByDayId[l.plan_day_id] = l;

    return {
      plan,
      phases,
      weeks,
      milestones,
      todayDetail,
      weekDays,
      logsByDayId,
      source: "live",
    };
  } catch (err) {
    console.warn(
      "[journey] live Supabase data unavailable, rendering fixture fallback:",
      err instanceof Error ? err.message : err,
    );
    return fixtureBundle();
  }
}

/** The full derived view for the public journey, for `today` in NY time. */
export async function loadJourney(now: Date = new Date()): Promise<JourneyView> {
  const todayISO = todayInZone(RACE_TIMEZONE, now);
  const bundle = await loadBundle(todayISO);
  return computeView(bundle, todayISO);
}
