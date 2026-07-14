import type { PublicPlan } from "@/components/journey/journey-model";
import { formatLongDate } from "@/components/journey/journey-time";
import { CourseSvg } from "../course-svg";
import { OverlayHeader, OverlayFooter, OverlaySection, overlayTitleId } from "./overlay-chrome";

/** A hand-built, deliberately gentle elevation strip (Baystate is flat/paved). */
function ElevationStrip() {
  return (
    <svg viewBox="0 0 400 70" className="h-16 w-full" role="img" aria-label="Stylized elevation profile: a flat, paved course with only gentle bridge rises.">
      <defs>
        <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sd-accent)" stopOpacity={0.28} />
          <stop offset="100%" stopColor="var(--sd-accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d="M 0 52 L 40 50 L 90 46 L 130 40 L 160 48 L 210 44 L 250 38 L 290 46 L 330 42 L 400 50 L 400 70 L 0 70 Z"
        fill="url(#elev-fill)"
      />
      <path
        d="M 0 52 L 40 50 L 90 46 L 130 40 L 160 48 L 210 44 L 250 38 L 290 46 L 330 42 L 400 50"
        fill="none"
        stroke="var(--sd-accent)"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-sd-tile border border-sd-line bg-sd-box/40 px-3 py-2">
      <span className="sd-stat-label">{label}</span>
      <span className="text-sm text-sd-ink">{value}</span>
    </div>
  );
}

/** The Course expand: the full course diagram, an elevation strip, and facts. */
export function CourseOverlay({ plan }: { plan: PublicPlan }) {
  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow="Target course · Baystate Half · Lowell, MA"
        title="The course"
        titleId={overlayTitleId("course")}
        subtitle="A stylized diagram of the out-and-back along the Merrimack River. It marks the shape, the turnaround, and the kilometre splits; it is not a geographic map."
      />

      <div className="rounded-sd-card border border-sd-line bg-sd-darker-box/50 p-4">
        <CourseSvg className="h-auto w-full" />
      </div>

      <OverlaySection title="Elevation">
        <div className="rounded-sd-card border border-sd-line bg-sd-box/40 p-4">
          <ElevationStrip />
          <p className="mt-2 text-xs text-sd-ink-dull">
            Flat and paved, with only gentle bridge rises. A course that rewards
            even pacing rather than surging.
          </p>
        </div>
      </OverlaySection>

      <OverlaySection title="Race facts">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact label="Race" value={plan.race_name ?? plan.title} />
          <Fact
            label="Distance"
            value={plan.race_distance_km != null ? `${plan.race_distance_km} km` : "Half"}
          />
          <Fact
            label="Date"
            value={plan.race_date ? formatLongDate(plan.race_date) : "TBD"}
          />
          <Fact label="Location" value={plan.race_location ?? "Lowell, MA"} />
        </div>
      </OverlaySection>

      <OverlayFooter />
    </div>
  );
}
