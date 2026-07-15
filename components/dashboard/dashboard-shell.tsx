"use client";

/**
 * The interactive dashboard surface: the masthead, the one-viewport bento grid
 * of client widgets, and the expand-overlay host. Overlay CONTENT is rendered
 * on the server (reusing the existing day / stats / progress components) and
 * passed in as a keyed map of nodes; this shell only decides which one is open.
 *
 * Deep links: opening a widget pushes `#w=<key>` and history-back closes it;
 * loading the page with that hash opens the overlay on mount. All motion is CSS
 * and reduced-motion-guarded (see globals.css).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DashboardData, OverlayKey } from "./data";
import { OverlayDialog, type OriginRect } from "./overlay-dialog";
import { Masthead } from "./masthead";
import { CountdownWidget } from "./widgets/countdown-widget";
import { TodayWidget } from "./widgets/today-widget";
import { SpotlightWidget } from "./widgets/spotlight-widget";
import { CourseMapWidget } from "./widgets/course-map-widget";
import { WeekVolumeWidget } from "./widgets/week-volume-widget";
import { HeatmapMiniWidget } from "./widgets/heatmap-mini-widget";
import { StatTile } from "./widgets/stat-tile";
import { NextMilestoneChip } from "./widgets/next-milestone-chip";
import { DayBrowseOverlay } from "./overlays/day-browse-overlay";

const OVERLAY_KEYS: OverlayKey[] = [
  "journey",
  "today",
  "spotlight",
  "course",
  "week",
  "heatmap",
];

function keyFromHash(hash: string): OverlayKey | null {
  const m = /^#w=([a-z]+)$/.exec(hash);
  const k = m?.[1] as OverlayKey | undefined;
  return k && OVERLAY_KEYS.includes(k) ? k : null;
}

interface Props {
  data: DashboardData;
  overlays: Record<OverlayKey, ReactNode>;
}

export function DashboardShell({ data, overlays }: Props) {
  const [active, setActive] = useState<OverlayKey | null>(null);
  const [origin, setOrigin] = useState<OriginRect | null>(null);
  // The day browser's selection lives here so the Today overlay can follow it:
  // on today it keeps the rich server-rendered detail; on any other day it shows
  // the compact summary + a full-detail link.
  const [selectedDate, setSelectedDate] = useState(data.todayISO);
  // The week-volume switcher's selection: which of weeks 1..14 the gauge shows.
  const [selectedWeek, setSelectedWeek] = useState(data.currentWeekIndex);

  // Open on load when a deep-link hash is present, and keep in sync with the
  // hash on manual edits / history navigation.
  useEffect(() => {
    const sync = () => setActive(keyFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const open = useCallback((key: OverlayKey, rect: OriginRect) => {
    setOrigin(rect);
    setActive(key);
    if (window.location.hash !== `#w=${key}`) {
      window.history.pushState(null, "", `#w=${key}`);
    }
  }, []);

  const close = useCallback(() => {
    if (/^#w=/.test(window.location.hash)) {
      // Pop the pushed hash entry; the popstate listener clears `active`.
      window.history.back();
    } else {
      setActive(null);
    }
  }, []);

  const labelledById = active ? `overlay-title-${active}` : "";

  const grid = useMemo(
    () => [
      {
        key: "countdown",
        cls: "lg:[grid-area:1/1/4/4] max-lg:min-h-[9rem]",
        node: (
          <CountdownWidget
            data={data.countdown}
            dayNumber={data.dayNumber}
            totalDays={data.totalDays}
            onOpen={open}
          />
        ),
      },
      {
        key: "today",
        cls: "lg:[grid-area:1/4/4/7] max-lg:min-h-[9rem]",
        node: (
          <TodayWidget
            data={data.today}
            days={data.days}
            todayISO={data.todayISO}
            totalDays={data.totalDays}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpen={open}
          />
        ),
      },
      {
        key: "spotlight",
        cls: "lg:[grid-area:1/7/5/13] max-lg:min-h-[15rem]",
        node: <SpotlightWidget spotlight={data.spotlight} onOpen={open} />,
      },
      {
        key: "stat-1",
        cls: "lg:[grid-area:4/1/5/2] max-lg:min-h-[6rem]",
        node: (
          <StatTile
            label="Completed"
            value={data.stats.anyLogged ? `${data.stats.completedKm}` : "0"}
            caption={`of ${data.stats.totalPlannedKm} km`}
            overlayKey="heatmap"
            onOpen={open}
          />
        ),
      },
      {
        key: "stat-2",
        cls: "lg:[grid-area:4/2/5/3] max-lg:min-h-[6rem]",
        node: (
          <StatTile
            label="Sessions"
            value={`${data.stats.completionPct}%`}
            caption={`${data.stats.sessionsCompleted}/${data.stats.sessionsPlanned}`}
            overlayKey="heatmap"
            onOpen={open}
          />
        ),
      },
      {
        key: "stat-3",
        cls: "lg:[grid-area:4/3/5/4] max-lg:min-h-[6rem]",
        node: (
          <StatTile
            label="Streak"
            value={`${data.stats.currentStreak}`}
            caption={`best ${data.stats.longestStreak}`}
            overlayKey="heatmap"
            onOpen={open}
          />
        ),
      },
      {
        key: "milestone",
        cls: "lg:[grid-area:4/4/5/7] max-lg:min-h-[5rem]",
        node: <NextMilestoneChip data={data.nextMilestone} onOpen={open} />,
      },
      {
        key: "course",
        cls: "lg:[grid-area:5/1/7/7] max-lg:min-h-[11rem]",
        node: <CourseMapWidget onOpen={open} />,
      },
      {
        key: "week",
        cls: "lg:[grid-area:5/7/7/10] max-lg:min-h-[11rem]",
        node: (
          <WeekVolumeWidget
            weeks={data.weeks}
            currentWeekIndex={data.currentWeekIndex}
            totalWeeks={data.countdown.totalWeeks}
            selectedWeekIndex={selectedWeek}
            onSelectWeek={setSelectedWeek}
            onOpen={open}
          />
        ),
      },
      {
        key: "heatmap",
        cls: "lg:[grid-area:5/10/7/13] max-lg:min-h-[11rem]",
        node: <HeatmapMiniWidget data={data.heatmap} onOpen={open} />,
      },
    ],
    [data, open, selectedDate, selectedWeek],
  );

  // The Today overlay follows the day browser: today keeps its rich server node;
  // any other day shows the compact summary + full-detail link (hash stays #w=today).
  const browsedDay =
    active === "today" && selectedDate !== data.todayISO
      ? data.days.find((d) => d.date === selectedDate) ?? null
      : null;

  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden lg:h-dvh lg:overflow-hidden">
      <Masthead data={data} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 sm:gap-3.5 sm:p-4 lg:grid-cols-12 lg:grid-rows-6">
        {grid.map((w) => (
          <div key={w.key} className={`min-h-0 ${w.cls}`}>
            {w.node}
          </div>
        ))}
      </div>

      <OverlayDialog
        open={active !== null}
        onClose={close}
        labelledById={labelledById}
        origin={origin}
      >
        {browsedDay ? (
          <DayBrowseOverlay day={browsedDay} totalDays={data.totalDays} />
        ) : active ? (
          overlays[active]
        ) : null}
      </OverlayDialog>
    </main>
  );
}
