// Pure matching logic — no DB, no network, unit-testable. Matches Strava
// activities to plan days by same calendar date (America/New_York) and sport
// family (Run <-> run sessions, Ride <-> bike sessions). At most one activity is
// auto-matched per (day, family); the earliest wins, extras go to manual.

export type SportFamily = 'run' | 'ride' | 'other';

const MATCH_TIMEZONE = 'America/New_York';

const NY_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: MATCH_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Calendar date (YYYY-MM-DD) of a UTC instant in America/New_York. en-CA
 * formats as ISO-like YYYY-MM-DD, so this is a stable key for date matching.
 */
export function nyCalendarDate(utcIso: string): string | null {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return null;
  return NY_DATE_FMT.format(d); // e.g. "2026-07-13"
}

/** Classify a Strava sport_type (or legacy type) into a family. */
export function stravaSportFamily(sportType: string | null | undefined): SportFamily {
  if (!sportType) return 'other';
  const s = sportType.toLowerCase();
  if (s.includes('run')) return 'run'; // Run, TrailRun, VirtualRun, Treadmill via type
  if (s.includes('ride') || s.includes('bike') || s.includes('cycl')) return 'ride';
  return 'other';
}

/** Run-type plan session categories (see SessionCategory in the DB types). */
const RUN_CATEGORIES = new Set(['easy_run', 'long_run', 'quality_run', 'race']);
const BIKE_CATEGORIES = new Set(['bike']);

/**
 * The sport families a plan day "supports", from its session categories plus
 * planned running distance. A brick day (run + bike) supports both.
 */
export function dayFamilies(
  sessionCategories: Array<string | null | undefined>,
  plannedRunKm: number | null | undefined,
): Set<SportFamily> {
  const families = new Set<SportFamily>();
  for (const c of sessionCategories) {
    if (c && RUN_CATEGORIES.has(c)) families.add('run');
    if (c && BIKE_CATEGORIES.has(c)) families.add('ride');
  }
  if ((plannedRunKm ?? 0) > 0) families.add('run');
  return families;
}

export interface MatchableDay {
  planDayId: string;
  /** Calendar date in YYYY-MM-DD (the plan_days.date column). */
  date: string;
  families: Set<SportFamily>;
}

export interface MatchableActivity {
  stravaId: number;
  /** UTC ISO start instant. */
  startDate: string;
  family: SportFamily;
}

export interface MatchResult {
  /** strava_id -> plan_day_id for auto-matched activities. */
  matched: Map<number, string>;
  /** strava_ids with no confident match (manual linking). */
  unmatched: number[];
}

/**
 * Assign activities to days. Deterministic: activities are processed earliest
 * first, and each (day, family) slot is filled at most once — so two runs on one
 * day link the first and leave the rest for manual linking.
 */
export function matchActivities(
  days: MatchableDay[],
  activities: MatchableActivity[],
): MatchResult {
  // Index days by "date|family" for O(1) lookup.
  const dayByKey = new Map<string, string>();
  for (const day of days) {
    for (const fam of day.families) {
      dayByKey.set(`${day.date}|${fam}`, day.planDayId);
    }
  }

  const claimed = new Set<string>(); // "date|family" slots already filled
  const matched = new Map<number, string>();
  const unmatched: number[] = [];

  const ordered = [...activities].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  for (const act of ordered) {
    if (act.family === 'other') {
      unmatched.push(act.stravaId);
      continue;
    }
    const date = nyCalendarDate(act.startDate);
    if (!date) {
      unmatched.push(act.stravaId);
      continue;
    }
    const key = `${date}|${act.family}`;
    const planDayId = dayByKey.get(key);
    if (planDayId && !claimed.has(key)) {
      claimed.add(key);
      matched.set(act.stravaId, planDayId);
    } else {
      unmatched.push(act.stravaId);
    }
  }

  return { matched, unmatched };
}
