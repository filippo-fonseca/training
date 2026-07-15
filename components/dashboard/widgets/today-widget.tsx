"use client";

import { useCallback, type KeyboardEvent } from "react";
import type { SessionCategory } from "@/lib/types/database";
import type { CompactDay } from "@/lib/db";
import { categoryMeta } from "@/components/calendar/status";
import { formatShortDate } from "@/components/journey/journey-time";
import type { TodayData, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard } from "../widget-card";
import { VerifiedBadge } from "../verified-badge";

interface Props {
  data: TodayData;
  /** Every plan day, date-ordered, for prev/next browsing. */
  days: CompactDay[];
  /** Today in the race timezone (the default selection + reset target). */
  todayISO: string;
  /** Total plan days, for the "DAY n/98" label. */
  totalDays: number;
  /** The currently browsed day (owned by the shell so the overlay can follow). */
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-sd-line bg-sd-darker-box px-2 py-0.5 font-mono text-[10px] tracking-wide text-sd-ink-dull sd-numeral">
      {children}
    </span>
  );
}

/** A prev/next browse control: the day page's DayArrow idiom (small round
 *  bordered button, sd-press, disabled at the plan bounds). A separate button
 *  from the widget's expand target, so it never triggers the overlay. */
function BrowseArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const glyph = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "prev" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
  const base =
    "pointer-events-auto grid size-7 place-items-center rounded-full border border-sd-line bg-sd-box";
  if (disabled) {
    return (
      <span aria-disabled className={`${base} cursor-not-allowed text-sd-ink-faint/40`}>
        {glyph}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous day" : "Next day"}
      onClick={(e) => {
        // A separate button, but stop the click from reaching the widget's
        // expand target under any DOM arrangement (design brief).
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      className={`${base} sd-press cursor-pointer text-sd-ink-dull hover:border-sd-selected hover:bg-sd-hover hover:text-sd-ink`}
    >
      {glyph}
    </button>
  );
}

/**
 * The day browser. Defaults to today (America/New_York) and reads today's rich
 * evidence exactly as before; the header chevrons (and Left/Right arrow keys
 * while the widget has focus) walk to any plan day and swap the content to that
 * day's compact record. Off-plan evidence shows verified but never completes a
 * planned session (ruling D11). Expands to the day-detail overlay; when browsing
 * away from today the overlay carries the compact summary + a full-detail link.
 */
export function TodayWidget({
  data,
  days,
  todayISO,
  totalDays,
  selectedDate,
  onSelectDate,
  onOpen,
}: Props) {
  const isToday = selectedDate === todayISO;
  const index = days.findIndex((d) => d.date === selectedDate);
  const compact = index >= 0 ? days[index] : null;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < days.length - 1;

  const goPrev = useCallback(() => {
    if (canPrev) onSelectDate(days[index - 1].date);
  }, [canPrev, days, index, onSelectDate]);
  const goNext = useCallback(() => {
    if (canNext) onSelectDate(days[index + 1].date);
  }, [canNext, days, index, onSelectDate]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext],
  );

  // Normalize today's rich data and a browsed day's compact record to one shape
  // so the body renders identically (fixed internal layout => no size change).
  const firstRun = data.evidence[0];
  const view = isToday
    ? {
        weekday: data.weekday,
        dateShort: data.dateShort,
        dayIndex: null as number | null,
        title: data.sessionTitle,
        category: data.category,
        showCategoryChip: !data.nothingPlanned && !!data.category,
        fallbackText: data.isRest ? "Recovery / rest" : "No session prescribed",
        verified: data.onPlan,
        offPlanVerified: data.offPlanRun,
        offPlanLoggedKm:
          data.offPlanRun && firstRun?.distanceM != null ? firstRun.distanceM / 1000 : null,
        distanceKm: data.distanceKm,
        paceText: data.paceText,
        rpeText: data.rpeText,
      }
    : {
        weekday: compact?.weekday ?? null,
        dateShort: compact ? formatShortDate(compact.date) : null,
        dayIndex: compact?.dayIndex ?? null,
        title: compact?.title ?? "Nothing planned",
        category: compact?.category ?? null,
        showCategoryChip: !!compact?.category && compact.category !== "rest",
        fallbackText: compact?.category === "rest" ? "Recovery / rest" : "No session prescribed",
        verified: compact?.verified ?? false,
        offPlanVerified: compact?.offPlanVerified ?? false,
        offPlanLoggedKm: null as number | null,
        distanceKm: compact?.distanceKm ?? null,
        paceText: compact?.paceText ?? null,
        rpeText: compact?.rpeText ?? null,
      };

  // The mono small-caps label: "TODAY · <weekday> · <date>" on today, or
  // "<WEEKDAY> · <MMM D> · DAY n/98" when browsing (sd-stat-label uppercases it).
  const headerLabel = isToday
    ? `Today${view.weekday ? ` · ${view.weekday}` : ""}${view.dateShort ? ` · ${view.dateShort}` : ""}`
    : `${view.weekday ?? ""}${view.dateShort ? ` · ${view.dateShort}` : ""}${
        view.dayIndex != null ? ` · Day ${view.dayIndex}/${totalDays}` : ""
      }`;

  const cat = categoryMeta((view.category as SessionCategory | null) ?? null);
  const badgeLabel = view.verified
    ? "Verified"
    : view.offPlanVerified
      ? "Off-plan · verified"
      : null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="relative h-full" onKeyDown={onKeyDown}>
      <WidgetCard
        overlayKey="today"
        label={isToday ? "today's session" : "the selected day"}
        onOpen={onOpen}
        bodyClassName="p-4 sm:p-5"
      >
        {/* Header: the day label. The controls float over the top-right (they are
            separate buttons, so reserve room here and never nest them in this one).
            The label truncates so it can never slide under the controls. */}
        <div className="flex min-w-0 items-start pr-24">
          <span className="sd-stat-label block min-w-0 truncate" title={headerLabel}>
            {headerLabel}
          </span>
        </div>

        {/* Content region: re-keyed by date so it replays the entrance grammar
            (a quick fade/slide) on each browse; instant under reduced motion. */}
        <div
          key={selectedDate}
          className="sd-enter mt-1 flex min-h-0 flex-1 flex-col justify-center gap-2"
        >
          <h2
            title={view.title}
            className="line-clamp-2 font-sans text-xl font-semibold leading-tight tracking-tight text-sd-ink sm:text-2xl"
          >
            {view.title}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            {view.showCategoryChip ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-tiny text-sd-ink-dull"
                style={{
                  borderColor: cat.hueVar ? `var(${cat.hueVar})` : "var(--sd-line)",
                  background: cat.hueVar
                    ? `color-mix(in srgb, var(${cat.hueVar}) 15%, transparent)`
                    : "var(--sd-darker-box)",
                }}
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: cat.hueVar ? `var(${cat.hueVar})` : "var(--sd-ink-faint)" }}
                />
                {cat.label}
              </span>
            ) : (
              <span className="text-tiny text-sd-ink-faint">{view.fallbackText}</span>
            )}
            {badgeLabel ? <VerifiedBadge label={badgeLabel} /> : null}
          </div>

          {/* Target chips (planned) or the off-plan run's logged evidence. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {view.offPlanLoggedKm != null ? (
              <Chip>{`${view.offPlanLoggedKm.toFixed(1)} km logged`}</Chip>
            ) : (
              <>
                {view.distanceKm != null && view.distanceKm > 0 ? (
                  <Chip>{view.distanceKm} km</Chip>
                ) : null}
                {view.paceText ? <Chip>{view.paceText}</Chip> : null}
                {view.rpeText ? <Chip>RPE {view.rpeText.replace(/\/10$/, "")}</Chip> : null}
              </>
            )}
          </div>
        </div>
      </WidgetCard>

      {/* Browse controls: siblings of the expand button (never nested), floated
          over the header's top-right. pointer-events-none on the wrapper so only
          the controls capture clicks; the rest of the header still expands. */}
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5">
        {!isToday ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onSelectDate(todayISO);
            }}
            className="pointer-events-auto sd-press cursor-pointer rounded-full border border-sd-accent/40 bg-sd-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-sd-accent hover:border-sd-accent hover:bg-sd-accent/15"
          >
            Today
          </button>
        ) : null}
        <BrowseArrow dir="prev" disabled={!canPrev} onClick={goPrev} />
        <BrowseArrow dir="next" disabled={!canNext} onClick={goNext} />
      </div>
    </div>
  );
}
