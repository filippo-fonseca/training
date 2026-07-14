import type { ReactNode } from "react";
import { BoldAmbient } from "@/components/ui/bold-ambient";
import { assembleDashboard, type OverlayKey } from "@/components/dashboard/data";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { JourneyOverlay } from "@/components/dashboard/overlays/journey-overlay";
import { TodayOverlay } from "@/components/dashboard/overlays/today-overlay";
import { SpotlightOverlay } from "@/components/dashboard/overlays/spotlight-overlay";
import { CourseOverlay } from "@/components/dashboard/overlays/course-overlay";
import { WeekOverlay } from "@/components/dashboard/overlays/week-overlay";
import { HeatmapOverlay } from "@/components/dashboard/overlays/heatmap-overlay";

// "Today" is resolved per request (America/New_York), so the dashboard renders
// dynamically rather than being frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const bundle = await assembleDashboard();

  // Overlay content is server-rendered here (reusing the existing day / stats /
  // progress components) and handed to the client shell, which only toggles
  // which one is visible.
  const overlays: Record<OverlayKey, ReactNode> = {
    journey: <JourneyOverlay view={bundle.view} progress={bundle.progress} />,
    today: <TodayOverlay view={bundle.view} />,
    spotlight: (
      <SpotlightOverlay
        spotlight={bundle.spotlight}
        recent={bundle.recentVerified}
      />
    ),
    course: <CourseOverlay plan={bundle.view.plan} />,
    week: <WeekOverlay progress={bundle.progress} />,
    heatmap: <HeatmapOverlay stats={bundle.stats} />,
  };

  return (
    <>
      {/* Whisper ambient behind the whole surface; widgets own their own glow. */}
      <BoldAmbient whisper fixed />
      <DashboardShell data={bundle.data} overlays={overlays} />
    </>
  );
}
