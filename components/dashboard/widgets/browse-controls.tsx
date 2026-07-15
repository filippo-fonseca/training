"use client";

import type { ReactNode } from "react";

/**
 * The shared prev/next browse affordance for the dashboard's widget switchers,
 * lifted verbatim from the today-widget's day browser so week-volume, the
 * next-milestone chip, and the spotlight all feel identical: a small round
 * bordered chevron (sd-press, disabled at the bounds), floated over the widget's
 * top-right in a pointer-events-none wrapper so only the controls capture clicks
 * and the rest of the card still opens the overlay. Every arrow stops the click
 * (and keydown, at the call site) from reaching the expand target.
 */

/** A single chevron. Disabled renders as a still-visible, non-interactive span
 *  (honest at the bounds) but keeps its aria-label for assistive tech. */
export function BrowseArrow({
  dir,
  label,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  label: string;
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
      <span
        aria-label={label}
        aria-disabled
        className={`${base} cursor-not-allowed text-sd-ink-faint/40`}
      >
        {glyph}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
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

/** The accent reset pill ("TODAY" / "THIS WEEK" / "NEXT" / "LATEST"). Only
 *  shown when browsed away from the default; jumps back to it on click. */
export function ResetChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      className="pointer-events-auto sd-press cursor-pointer rounded-full border border-sd-accent/40 bg-sd-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-sd-accent hover:border-sd-accent hover:bg-sd-accent/15"
    >
      {children}
    </button>
  );
}

/** The floated control cluster: an optional reset chip followed by the two
 *  chevrons, pinned to the widget's top-right. The wrapper is pointer-events-none
 *  so only the buttons inside it are clickable; the rest of the card expands. */
export function BrowseControls({
  reset,
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  reset?: ReactNode;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5">
      {reset}
      <BrowseArrow dir="prev" label={prevLabel} disabled={!canPrev} onClick={onPrev} />
      <BrowseArrow dir="next" label={nextLabel} disabled={!canNext} onClick={onNext} />
    </div>
  );
}
