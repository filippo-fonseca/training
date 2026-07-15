"use client";

import type { OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard } from "../widget-card";
import { CourseSvg } from "../course-svg";
import { StaticCourseMap, MAP_BG } from "../static-course-map";
import { buildStaticMapUrl, projectedRoutePoints } from "../course-map-config";

interface Props {
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/**
 * The course card. The map IS the card: it fills the whole tile edge-to-edge as
 * the background (keyed Google Static Maps image, or the keyless self-contained
 * OSM SVG), with the whole loop fit inside with margin. Everything else (the
 * label, the caption, the OSM attribution) floats over the map inside small dark
 * chips so it clears WCAG AA against any map region behind it, rather than a full
 * scrim that would dim the animated runner. Either mode draws the same baked OSM
 * loop; the author's avatar rides the drawn line forever. Expands to the full
 * course overlay.
 */
export function CourseMapWidget({ onOpen }: Props) {
  const staticMapUrl = buildStaticMapUrl();

  return (
    <WidgetCard
      overlayKey="course"
      label="course map"
      onOpen={onOpen}
      bodyClassName="p-0"
    >
      {/* Full-bleed map background. MAP_BG under both modes keeps the letterbox
          (static) and the SVG canvas the same dark map tone. */}
      <div className="absolute inset-0" style={{ backgroundColor: MAP_BG }}>
        {staticMapUrl && projectedRoutePoints ? (
          <StaticCourseMap
            src={staticMapUrl}
            points={projectedRoutePoints}
            alt="Dark street map of the Baystate Half Marathon course in Lowell, Massachusetts, the loop traced in cyan along the Merrimack River, with the runner's avatar tracing the loop."
            className="h-full w-full"
          />
        ) : (
          <CourseSvg className="h-full w-full" />
        )}
      </div>

      {/* Content floating over the map. Chips (bg-sd-darker-box + blur) carry the
          AA contrast so the map and the moving runner stay fully bright. */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex">
          <span className="sd-stat-label rounded-full bg-[var(--sd-darker-box)]/85 px-2.5 py-1 text-sd-ink-dull shadow-sm ring-1 ring-[var(--sd-line)]/60 backdrop-blur-sm">
            Target course
          </span>
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <span className="rounded-md bg-[var(--sd-darker-box)]/85 px-2.5 py-1 font-mono text-[11px] leading-none tracking-wide text-sd-ink-dull shadow-sm ring-1 ring-[var(--sd-line)]/60 backdrop-blur-sm">
            Baystate Half · Lowell, MA · 2 laps
          </span>
          <span className="rounded bg-[var(--sd-darker-box)]/70 px-1.5 py-0.5 font-mono text-[9px] leading-none tracking-wide text-sd-ink-faint backdrop-blur-sm">
            Trace (c) OpenStreetMap contributors
          </span>
        </div>
      </div>
    </WidgetCard>
  );
}
