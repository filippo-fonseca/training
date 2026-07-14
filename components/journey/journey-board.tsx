import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/design/cn";
import { staggerStyle } from "@/lib/design/motion";
import { loadJourney } from "./data";
import { JourneyHero } from "./journey-hero";
import { TodayCard } from "./today-card";
import { WeekSnapshot } from "./week-snapshot";
import { NextMilestone } from "./next-milestone";

/** A staggered entrance wrapper for the dashboard panels below the hero. */
function Enter({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("sd-enter", className)} style={staggerStyle(index)}>
      {children}
    </div>
  );
}

function JourneyFooter({ isFixture }: { isFixture: boolean }) {
  return (
    <footer className="sd-enter flex flex-col gap-4 border-t border-sd-line pt-6" style={staggerStyle(6)}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/calendar" className="sd-btn sd-btn-quiet">
          Training calendar
        </Link>
        <Link href="/milestones" className="sd-btn sd-btn-quiet">
          Milestone timeline
        </Link>
      </div>
      <p className="text-xs text-sd-ink-faint">
        A public, read-only training journey. Built on the Baystate 2026 plan.
        {isFixture ? " Showing preview data while the live plan connects." : ""}
      </p>
    </footer>
  );
}

/** Async server component: loads the live journey (fixture fallback) and lays it out. */
export async function JourneyBoard() {
  const view = await loadJourney();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
      <JourneyHero view={view} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Enter index={0} className="lg:col-span-2">
          <TodayCard view={view} />
        </Enter>
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Enter index={1}>
            <WeekSnapshot view={view} />
          </Enter>
          <Enter index={2}>
            <NextMilestone view={view} />
          </Enter>
        </div>
      </div>

      <JourneyFooter isFixture={view.source === "fixture"} />
    </div>
  );
}
