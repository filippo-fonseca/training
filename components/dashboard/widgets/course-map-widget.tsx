"use client";

import type { OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";
import { CourseSvg } from "../course-svg";

interface Props {
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/** The stylized hand-built course diagram. Expands to the full course overlay. */
export function CourseMapWidget({ onOpen }: Props) {
  return (
    <WidgetCard
      overlayKey="course"
      label="course map"
      onOpen={onOpen}
      bodyClassName="p-4 sm:p-5"
    >
      <WidgetLabel>Target course</WidgetLabel>
      <div className="flex min-h-0 flex-1 items-center justify-center py-1">
        <CourseSvg className="h-full max-h-full w-full" />
      </div>
      <span className="sd-stat-label text-sd-ink-faint">
        Baystate Half · Lowell, MA
      </span>
    </WidgetCard>
  );
}
