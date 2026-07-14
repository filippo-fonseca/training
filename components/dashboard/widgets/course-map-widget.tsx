"use client";

import type { OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";
import { CourseSvg } from "../course-svg";
import { buildStaticMapUrl } from "../course-map-config";

interface Props {
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/**
 * The course card. With a Maps key it shows a dark Google Static Maps image of
 * the real course (the loop drawn via an encoded polyline); without a key it
 * renders the self-contained OSM SVG. Either way the geometry is the same baked
 * OSM loop. Expands to the full course overlay.
 */
export function CourseMapWidget({ onOpen }: Props) {
  const staticMapUrl = buildStaticMapUrl();

  return (
    <WidgetCard
      overlayKey="course"
      label="course map"
      onOpen={onOpen}
      bodyClassName="p-4 sm:p-5"
    >
      <WidgetLabel>Target course</WidgetLabel>
      <div className="flex min-h-0 flex-1 items-center justify-center py-1">
        {staticMapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticMapUrl}
            alt="Dark street map of the Baystate Half Marathon course in Lowell, Massachusetts, the loop traced in cyan along the Merrimack River."
            className="h-full max-h-full w-full rounded-sd-tile object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <CourseSvg className="h-full max-h-full w-full" />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="sd-stat-label text-sd-ink-faint">
          Baystate Half · Lowell, MA · 2 laps
        </span>
        <span className="font-mono text-[9px] leading-none tracking-wide text-sd-ink-faint/70">
          Trace (c) OpenStreetMap contributors
        </span>
      </div>
    </WidgetCard>
  );
}
