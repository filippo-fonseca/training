"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "./data";

const MENU_LINKS: Array<[string, string]> = [
  ["/calendar", "Calendar"],
  ["/progress", "Progress"],
  ["/stats", "Stats"],
  ["/milestones", "Milestones"],
];

/**
 * The hyperpolymath-voice masthead: "THE COMEBACK" wordmark in mono small-caps
 * with an accent tick, the manifesto line, and "EST. 2026 · LOWELL, MA" plus a
 * live day counter, with a menu that keeps the underlying routes reachable.
 */
export function Masthead({ data }: { data: DashboardData }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between gap-3 border-b border-sd-divider px-4 sm:px-6">
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-1.5 rounded-full bg-sd-accent" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sd-ink">
          {data.wordmark}
        </span>
      </div>

      {/* Manifesto (hidden on narrow screens). Full ink at 13px/medium for
          legibility; sd-ink clears AAA on the masthead's --sd-app field. */}
      <p className="hidden min-w-0 flex-1 truncate px-4 text-center text-[13px] font-medium text-sd-ink md:block">
        {data.manifesto}
      </p>

      {/* Byline pill + separate GitHub button, then est + day counter + menu.
          Grouped with a gap-3/gap-4 rhythm so the clusters read as distinct. */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {/* Byline group: the pill (avatar + name) and a standalone GitHub button */}
        <div className="flex items-center gap-2">
          {/* Byline pill — race-chip idiom (border-sd-line + bg-sd-darker-box),
              the whole pill is the personal-site link. */}
          <a
            href="https://filippofonseca.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Filippo Fonseca's website"
            className="sd-press group flex items-center gap-2 rounded-full border border-sd-line bg-sd-darker-box px-2.5 py-1 text-sd-ink-dull transition-colors hover:border-sd-selected hover:text-sd-ink"
          >
            <img
              src="/filippo-avatar.png"
              alt=""
              width={18}
              height={18}
              className="size-[18px] shrink-0 rounded-full object-cover"
            />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] lg:inline">
              By Filippo Fonseca
            </span>
          </a>
          {/* Separate GitHub button — circular icon button, clear gap from the pill */}
          <a
            href="https://github.com/filippo-fonseca/training"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source on GitHub"
            className="sd-press grid size-7 shrink-0 place-items-center rounded-full border border-sd-line bg-sd-darker-box text-sd-ink-dull transition-colors hover:border-sd-selected hover:text-sd-ink"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
          </a>
        </div>
        {/* Est + day counter — ink-dull (7.46:1) and accent-faint (8.82:1), both AA */}
        <div className="flex items-center gap-3">
          <span className="hidden whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-sd-ink-dull sm:inline">
            {data.est}
          </span>
          <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-sd-accent-faint">
            Day {data.dayNumber} of {data.totalDays}
          </span>
        </div>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="sd-press grid size-8 place-items-center rounded-full border border-sd-line bg-sd-box text-sd-ink-dull hover:border-sd-selected hover:text-sd-ink"
          aria-label="Menu"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <nav
            role="menu"
            className="sd-panel absolute right-4 top-11 z-50 flex min-w-40 flex-col gap-0.5 p-1.5 sm:right-6"
          >
            {MENU_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="sd-press rounded-sd-chrome px-3 py-1.5 text-sm text-sd-ink-dull hover:bg-sd-hover hover:text-sd-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
        </>
      ) : null}
    </header>
  );
}
