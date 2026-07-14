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

      {/* Manifesto (hidden on narrow screens) */}
      <p className="hidden min-w-0 flex-1 truncate px-4 text-center text-xs text-sd-ink-dull md:block">
        {data.manifesto}
      </p>

      {/* Est + day counter + menu */}
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-sd-ink-faint sm:inline">
          {data.est}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sd-accent-faint">
          Day {data.dayNumber} of {data.totalDays}
        </span>
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
