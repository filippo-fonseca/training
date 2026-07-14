/**
 * Server-only assembly for the public one-page dashboard. It gathers EVERY
 * widget's data in a single request through the existing, tested query and
 * derivation layer (the journey view model, the /stats and /progress loaders,
 * and the spotlight lookup from the auto-link cron unit), then hands typed,
 * serializable props to the client widgets plus the richer view models the
 * server-rendered overlays consume.
 *
 * Public-safe only: the journey view already projects to PublicPlan and gates
 * evidence on the onPlan flag (decision D2); the spotlight is projected through
 * toActivityEvidence, which hand-picks curated fields. No private notes, no
 * health data, no email ever crosses this boundary. When the environment is
 * unconfigured (this worktree, and any preview without Supabase env) every
 * loader degrades to its fixture, so the whole dashboard renders with
 * intentional empty states rather than crashing.
 *
 * Server-only by construction: it imports the anon Supabase readers and the
 * route loaders, all of which run in RSC/server context only.
 */
import { loadJourney } from "@/components/journey/data";
import type { JourneyView } from "@/components/journey/journey-model";
import {
  RACE_TIMEZONE,
  daysBetween,
  formatShortDate,
} from "@/components/journey/journey-time";
import { loadStats, type StatsPageData } from "@/app/(public)/stats/_data";
import { loadProgress, type ProgressData } from "@/app/(public)/progress/_data";
import { getAnonClient } from "@/components/calendar/data";
import {
  getLatestVerifiedActivity,
  getActivityLinksForPlan,
  getStravaActivities,
} from "@/lib/db";
import {
  toActivityEvidence,
  type ActivityEvidence,
} from "@/lib/derive";

/** Overlay keys, shared by the widgets, the dialog host, and the deep-link hash. */
export type OverlayKey =
  | "journey"
  | "today"
  | "spotlight"
  | "course"
  | "week"
  | "heatmap";

/** The serializable countdown widget props. */
export interface CountdownData {
  daysToRace: number;
  status: "upcoming" | "today" | "past";
  raceName: string;
  raceDistanceKm: number | null;
  raceDateShort: string | null;
  weekIndex: number;
  totalWeeks: number;
  phaseLabel: string;
  phaseWeek: number;
  phaseWeekCount: number;
  phaseProgress: number; // 0..1
}

/** The serializable today widget props. */
export interface TodayData {
  dateShort: string | null;
  weekday: string | null;
  sessionTitle: string;
  category: string | null;
  isRest: boolean;
  /** True on a no-plan day (no planned running session). */
  nothingPlanned: boolean;
  distanceKm: number | null;
  paceText: string | null;
  rpeText: string | null;
  /** Every linked activity for today (curated). Presence => a Verified badge. */
  evidence: ActivityEvidence[];
  /** True when the evidence completes a planned running session (on-plan). */
  onPlan: boolean;
  /** True when today's only evidence is an off-plan (day-level) run. */
  offPlanRun: boolean;
}

/** The serializable week-volume gauge props. */
export interface WeekData {
  loggedKm: number;
  plannedKm: number;
  rangeMin: number | null;
  rangeMax: number | null;
  phaseLabel: string;
  hasLogs: boolean;
}

/** The serializable stat tiles + next-milestone props. */
export interface StatTilesData {
  completedKm: number;
  totalPlannedKm: number;
  sessionsCompleted: number;
  sessionsPlanned: number;
  completionPct: number; // 0..100
  currentStreak: number;
  longestStreak: number;
  anyLogged: boolean;
}

export interface NextMilestoneData {
  title: string;
  dateShort: string | null;
  daysAway: number | null;
}

/** The heatmap-mini props (compressed contributions grid). */
export interface HeatmapMiniData {
  cells: StatsPageData["heatmap"];
  today: string;
  maxDayVolumeKm: number;
  totalDays: number;
}

/** Everything a client widget needs. Fully serializable (plain data). */
export interface DashboardData {
  source: "live" | "fixture";
  manifesto: string;
  est: string;
  wordmark: string;
  dayNumber: number;
  totalDays: number;
  countdown: CountdownData;
  today: TodayData;
  spotlight: ActivityEvidence | null;
  week: WeekData;
  stats: StatTilesData;
  nextMilestone: NextMilestoneData | null;
  heatmap: HeatmapMiniData;
}

/** The full bundle: serializable widget data + richer view models for overlays. */
export interface DashboardBundle {
  data: DashboardData;
  view: JourneyView;
  stats: StatsPageData;
  progress: ProgressData;
  spotlight: ActivityEvidence | null;
  /** Recent verified (linked) runs for the spotlight overlay, newest first. */
  recentVerified: ActivityEvidence[];
}

const MANIFESTO = "Rebuilding from injury to the Baystate Half. In public.";
const EST = "EST. 2026 · LOWELL, MA";
const WORDMARK = "THE COMEBACK";

/**
 * Look up the spotlight activity plus a short list of other recent verified
 * (linked) runs. Returns empty data when the environment is unconfigured so the
 * spotlight widget renders its generated route-pattern fallback.
 */
async function loadSpotlight(
  planId: string,
): Promise<{ spotlight: ActivityEvidence | null; recent: ActivityEvidence[] }> {
  const client = getAnonClient();
  if (!client) return { spotlight: null, recent: [] };
  try {
    const [latestRow, linkBundle, activities] = await Promise.all([
      getLatestVerifiedActivity(client, planId),
      getActivityLinksForPlan(client, planId),
      getStravaActivities(client, planId),
    ]);
    const spotlight = latestRow ? toActivityEvidence(latestRow) : null;
    // "Verified" == linked. Build the set of linked activity row ids, then
    // project those rows (already ordered start_date DESC) to curated evidence.
    const linkedIds = new Set(linkBundle.links.map((l) => l.strava_activity_id));
    const recent = activities
      .filter((a) => linkedIds.has(a.id))
      .map(toActivityEvidence)
      .slice(0, 6);
    return { spotlight, recent };
  } catch {
    return { spotlight: null, recent: [] };
  }
}

/** Assemble the whole dashboard in one server pass. */
export async function assembleDashboard(): Promise<DashboardBundle> {
  const [view, stats, progress] = await Promise.all([
    loadJourney(),
    loadStats(),
    loadProgress(),
  ]);
  const { spotlight, recent } = await loadSpotlight(view.plan.id);

  // Day counter: "day N of 98", clamped to the plan span.
  let dayNumber = 1;
  let totalDays = stats.heatmap.length || 98;
  if (view.plan.start_date && view.plan.end_date) {
    totalDays = daysBetween(view.plan.start_date, view.plan.end_date) + 1;
    const n = daysBetween(view.plan.start_date, view.todayISO) + 1;
    dayNumber = Math.max(1, Math.min(totalDays, n));
  }

  const onPlan = view.todayActual.source === "strava";
  const hasEvidence = view.todayEvidence.length > 0;
  const hasRunPlanned =
    view.session.primary != null && !view.session.isRest;

  const data: DashboardData = {
    source: view.source,
    manifesto: MANIFESTO,
    est: EST,
    wordmark: WORDMARK,
    dayNumber,
    totalDays,
    countdown: {
      daysToRace: view.race.countdown.days,
      status: view.race.countdown.status,
      raceName: view.race.name,
      raceDistanceKm: view.race.distanceKm,
      raceDateShort: view.race.date ? formatShortDate(view.race.date) : null,
      weekIndex: view.weekIndex,
      totalWeeks: view.totalWeeks,
      phaseLabel: view.phaseLabel,
      phaseWeek: view.phaseWeek,
      phaseWeekCount: view.phaseWeekCount,
      phaseProgress: view.phaseProgress,
    },
    today: {
      dateShort: view.session.day ? formatShortDate(view.session.day.date) : null,
      weekday: view.session.day?.weekday ?? null,
      sessionTitle:
        view.session.primary?.title ??
        (view.session.isRest ? "Rest day" : "Nothing planned"),
      category: view.session.primary?.category ?? null,
      isRest: view.session.isRest,
      nothingPlanned: !hasRunPlanned,
      distanceKm: view.session.primary?.distance_km ?? null,
      paceText: view.session.primary?.pace_text ?? null,
      rpeText: view.session.primary?.rpe_text ?? null,
      evidence: view.todayEvidence,
      onPlan,
      offPlanRun: hasEvidence && !onPlan,
    },
    spotlight,
    week: {
      loggedKm: view.week.loggedKm,
      plannedKm: view.week.plannedKm,
      rangeMin: view.week.rangeMin,
      rangeMax: view.week.rangeMax,
      phaseLabel: view.phaseLabel,
      hasLogs: view.week.hasLogs,
    },
    stats: {
      completedKm: stats.summary.totalCompletedKm,
      totalPlannedKm: stats.summary.totalPlannedKm,
      sessionsCompleted: stats.summary.sessionsCompleted,
      sessionsPlanned: stats.summary.sessionsPlanned,
      completionPct: Math.round(stats.summary.completionRate * 100),
      currentStreak: stats.summary.currentStreak,
      longestStreak: stats.summary.longestStreak,
      anyLogged: stats.summary.anyLogged,
    },
    nextMilestone: view.nextMilestone
      ? {
          title: view.nextMilestone.milestone.title,
          dateShort: view.nextMilestone.effectiveDate
            ? formatShortDate(view.nextMilestone.effectiveDate)
            : null,
          daysAway: view.nextMilestone.daysAway,
        }
      : null,
    heatmap: {
      cells: stats.heatmap,
      today: stats.today,
      maxDayVolumeKm: stats.summary.maxDayVolumeKm,
      totalDays,
    },
  };

  return { data, view, stats, progress, spotlight, recentVerified: recent };
}

/** Format a pace label (min/km) from curated distance + moving time. */
export function paceLabel(
  distanceM: number | null,
  movingTimeS: number | null,
): string | null {
  if (!distanceM || !movingTimeS || distanceM <= 0) return null;
  const sPerKm = movingTimeS / (distanceM / 1000);
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

/** Format meters as a km label like "12.4 km". */
export function kmLabel(distanceM: number | null): string | null {
  if (distanceM == null) return null;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

/** Format seconds as a compact moving-time label like "1:02:33" / "48:12". */
export function timeLabel(movingTimeS: number | null): string | null {
  if (movingTimeS == null) return null;
  const h = Math.floor(movingTimeS / 3600);
  const m = Math.floor((movingTimeS % 3600) / 60);
  const s = Math.round(movingTimeS % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** A short calendar label like "Oct 18" from an activity's ISO start date. */
export function activityDateShort(startDate: string | null): string | null {
  if (!startDate) return null;
  // start_date may be a full ISO timestamp; take the date portion.
  const iso = startDate.slice(0, 10);
  try {
    return formatShortDate(iso, RACE_TIMEZONE);
  } catch {
    return null;
  }
}
