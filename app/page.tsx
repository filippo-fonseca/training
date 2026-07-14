import { Suspense } from "react";
import { BoldAmbient } from "@/components/ui/bold-ambient";
import { JourneyBoard } from "@/components/journey/journey-board";
import { JourneySkeleton } from "@/components/journey/journey-skeleton";

// "Today" is resolved per request (America/New_York), so the journey must render
// dynamically rather than being frozen at build time.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* Whisper ambient behind the whole page; the hero owns the one focal orb. */}
      <BoldAmbient whisper fixed />
      <div className="relative z-10">
        <Suspense fallback={<JourneySkeleton />}>
          <JourneyBoard />
        </Suspense>
      </div>
    </main>
  );
}
