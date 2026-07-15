import Link from "next/link";
import type { SessionCategory } from "@/lib/types/database";
import type { CompactDay } from "@/lib/db";
import { categoryMeta } from "@/components/calendar/status";
import { formatLongDate } from "@/components/journey/journey-time";
import { VerifiedBadge } from "../verified-badge";
import { OverlayHeader, OverlayFooter, overlayTitleId } from "./overlay-chrome";

/**
 * The expand overlay for a browsed (non-today) day: the same compact fields the
 * widget shows, plus a prominent link to the full prescription at /day/<date>.
 * Off-plan evidence reads as verified but never completes a planned session
 * (ruling D11), mirroring the widget and the day page. Rendered by the client
 * shell (no server-only imports); the full detail lives on the day route.
 */
export function DayBrowseOverlay({
  day,
  totalDays,
}: {
  day: CompactDay;
  totalDays: number;
}) {
  const cat = categoryMeta((day.category as SessionCategory | null) ?? null);
  const showCategoryChip = !!day.category && day.category !== "rest";
  const badgeLabel = day.verified
    ? "Verified"
    : day.offPlanVerified
      ? "Off-plan · verified"
      : null;

  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow={`${day.weekday ?? ""} · ${formatLongDate(day.date)} · Day ${day.dayIndex}/${totalDays}`}
        title={day.title}
        titleId={overlayTitleId("today")}
      />

      <div className="flex flex-wrap items-center gap-2">
        {showCategoryChip ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-tiny text-sd-ink-dull"
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
          <span className="text-tiny text-sd-ink-faint">
            {day.category === "rest" ? "Recovery / rest" : "No session prescribed"}
          </span>
        )}
        {badgeLabel ? <VerifiedBadge label={badgeLabel} /> : null}
      </div>

      {/* Target chips: the planned prescription in brief. */}
      <div className="flex flex-wrap items-center gap-2">
        {day.distanceKm != null && day.distanceKm > 0 ? (
          <Stat label="Distance" value={`${day.distanceKm} km`} />
        ) : null}
        {day.paceText ? <Stat label="Pace" value={day.paceText} /> : null}
        {day.rpeText ? <Stat label="RPE" value={day.rpeText.replace(/\/10$/, "")} /> : null}
        {day.logged ? <Stat label="Log" value="Completed" /> : null}
      </div>

      {/* The full prescription lives on the day route; this overlay is a summary. */}
      <Link
        href={`/day/${day.date}`}
        className="sd-lift inline-flex w-fit items-center gap-2 rounded-full border border-sd-accent/40 bg-sd-accent/10 px-4 py-2 text-sm font-medium text-sd-accent hover:border-sd-accent hover:bg-sd-accent/15"
      >
        Full day detail
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>

      <OverlayFooter />
    </div>
  );
}

/** A small labelled stat pill for the overlay's target row. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sd-line bg-sd-darker-box px-3 py-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-sd-ink-faint">
        {label}
      </span>
      <span className="font-sans text-sm text-sd-ink sd-numeral">{value}</span>
    </span>
  );
}
