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
import { nyCalendarDate } from "@/lib/strava/match";
import { loadStats, type StatsPageData } from "@/app/(public)/stats/_data";
import { loadProgress, type ProgressData } from "@/app/(public)/progress/_data";
import {
  loadMilestones,
  type MilestonesData,
  type TimelineEntry,
} from "@/app/(public)/milestones/_data";
import { getAnonClient } from "@/components/calendar/data";
import {
  getActivityLinksForPlan,
  getStravaActivities,
  type CompactDay,
} from "@/lib/db";
import {
  selectVerifiedActivities,
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

/** One browseable week for the week-volume switcher: the same gauge facts as
 *  WeekData plus its 1-based index, so the widget can walk weeks 1..14. */
export interface WeekEntry {
  weekIndex: number;
  loggedKm: number;
  plannedKm: number;
  rangeMin: number | null;
  rangeMax: number | null;
  phaseLabel: string;
  hasLogs: boolean;
}

/** A compact, public-safe milestone/checkpoint for the next-milestone switcher.
 *  Curated fields only, projected from the /milestones timeline (13 entries):
 *  the entry's stable key, its title, its ordering date + human label, whether
 *  it is a milestone or a checkpoint, and a km target parsed from the title when
 *  the entry names one (e.g. a "21.1 km" gated long run), else null. */
export interface CompactMilestone {
  id: string;
  title: string;
  date: string | null;
  dateLabel: string;
  kind: "milestone" | "checkpoint";
  targetKm: number | null;
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
  /** Today in the race timezone (YYYY-MM-DD): the day browser's default anchor. */
  todayISO: string;
  /** First / last plan day (browsing bounds), or null when unconfigured. */
  planStart: string | null;
  planEnd: string | null;
  /** Every plan day as a compact, public-safe record for the day browser. */
  days: CompactDay[];
  countdown: CountdownData;
  today: TodayData;
  spotlight: ActivityEvidence | null;
  /** Every verified (linked) run, newest first, for the spotlight run switcher. */
  spotlightVerified: ActivityEvidence[];
  week: WeekData;
  /** Every plan week (1..14) as a browseable gauge record for the week switcher. */
  weeks: WeekEntry[];
  /** 1-based index of the current week: the switcher's default + reset target. */
  currentWeekIndex: number;
  stats: StatTilesData;
  nextMilestone: NextMilestoneData | null;
  /** The full milestone/checkpoint timeline (13 entries) for the chip switcher. */
  milestones: CompactMilestone[];
  /** Index of the next upcoming entry: the chip's default + reset target. */
  nextMilestoneIndex: number;
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

const MANIFESTO = "Rebuilding from injury to a Boston Qualifier (BQ) marathon time. In public.";
const EST = "EST. 2026 · LOWELL, MA";
const WORDMARK = "THE COMEBACK";

/**
 * Look up every verified (linked) run for the plan, newest first, plus the
 * latest as the spotlight default. Returns empty data when the environment is
 * unconfigured so the spotlight widget renders its generated route-pattern
 * fallback. The full list feeds the spotlight run switcher; the caller slices a
 * short tail for the "other recent runs" section of the overlay.
 */
async function loadSpotlight(
  planId: string,
): Promise<{ spotlight: ActivityEvidence | null; verified: ActivityEvidence[] }> {
  const client = getAnonClient();
  if (!client) return { spotlight: null, verified: [] };
  try {
    const [linkBundle, activities] = await Promise.all([
      getActivityLinksForPlan(client, planId),
      getStravaActivities(client, planId),
    ]);
    // "Verified" == linked. The readers order by start_date DESC, so the first
    // entry is the latest verified run (the spotlight default).
    const verified = selectVerifiedActivities(activities, linkBundle.links);
    return { spotlight: verified[0] ?? null, verified };
  } catch {
    return { spotlight: null, verified: [] };
  }
}

/** Parse a km target out of a milestone title when it names one (e.g. "21.1 km
 *  easy confidence run" -> 21.1), else null. There is no structured km column on
 *  a milestone, so the title is the only public-safe source. */
export function parseTargetKm(title: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*km\b/i.exec(title);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Project the /milestones timeline (13 entries) to the compact, public-safe
 *  switcher records, preserving the timeline's chronological order. */
export function toCompactMilestones(entries: TimelineEntry[]): CompactMilestone[] {
  return entries.map((e) => ({
    id: e.key,
    title: e.title,
    date: e.date,
    dateLabel: e.dateLabel,
    kind: e.kind,
    targetKm: parseTargetKm(e.title),
  }));
}

/** The default/reset selection for the milestone chip: the first entry that has
 *  not already passed (its next upcoming or current entry), or the last entry
 *  when the whole timeline is behind us. */
export function nextMilestoneIndex(entries: TimelineEntry[]): number {
  const i = entries.findIndex((e) => e.status !== "passed");
  if (i >= 0) return i;
  return entries.length > 0 ? entries.length - 1 : 0;
}

/** Project the weekly progress series to the browseable week-volume records. */
export function toWeekEntries(weekly: ProgressData["weekly"]): WeekEntry[] {
  return weekly.map((w) => ({
    weekIndex: w.weekIndex,
    loggedKm: w.actualKm ?? 0,
    plannedKm: w.plannedKm,
    rangeMin: w.rangeMinKm ?? null,
    rangeMax: w.rangeMaxKm ?? null,
    phaseLabel: w.phaseLabel ?? "",
    hasLogs: w.actualKm != null,
  }));
}

/** Assemble the whole dashboard in one server pass. */
export async function assembleDashboard(): Promise<DashboardBundle> {
  const [view, stats, progress, milestones] = await Promise.all([
    loadJourney(),
    loadStats(),
    loadProgress(),
    loadMilestones(),
  ]);
  const { spotlight, verified } = await loadSpotlight(view.plan.id);

  // Browseable projections for the three switchers (reuse loaded data; no
  // extra client fetches). Weeks come from the progress series; the milestone
  // timeline from the /milestones loader; verified runs from the spotlight lookup.
  const weeks = toWeekEntries(progress.weekly);
  const currentWeekIndex = Math.min(
    Math.max(1, view.weekIndex),
    weeks.length > 0 ? weeks.length : 1,
  );
  const compactMilestones = toCompactMilestones(milestones.entries);
  const nextMsIndex = nextMilestoneIndex(milestones.entries);

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
    todayISO: view.todayISO,
    planStart: view.plan.start_date,
    planEnd: view.plan.end_date,
    days: stats.days,
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
    spotlightVerified: verified,
    week: {
      loggedKm: view.week.loggedKm,
      plannedKm: view.week.plannedKm,
      rangeMin: view.week.rangeMin,
      rangeMax: view.week.rangeMax,
      phaseLabel: view.phaseLabel,
      hasLogs: view.week.hasLogs,
    },
    weeks,
    currentWeekIndex,
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
    milestones: compactMilestones,
    nextMilestoneIndex: nextMsIndex,
    heatmap: {
      cells: stats.heatmap,
      today: stats.today,
      maxDayVolumeKm: stats.summary.maxDayVolumeKm,
      totalDays,
    },
  };

  return {
    data,
    view,
    stats,
    progress,
    spotlight,
    recentVerified: verified.slice(0, 6),
  };
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

/** A short calendar label like "Oct 18" from an activity's ISO start timestamp.
 *  start_date is a full UTC instant, so resolve its calendar day in the app
 *  display timezone (America/New_York) BEFORE formatting, mirroring how the
 *  public status API derives its day. Slicing the raw UTC date would show the
 *  next day for a late-evening EDT run (stored past midnight UTC). */
export function activityDateShort(startDate: string | null): string | null {
  if (!startDate) return null;
  const iso = nyCalendarDate(startDate);
  if (!iso) return null;
  try {
    return formatShortDate(iso, RACE_TIMEZONE);
  } catch {
    return null;
  }
}
