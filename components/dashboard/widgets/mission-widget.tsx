"use client";

import type { OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard } from "../widget-card";

interface Props {
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/** The mission's first paragraph, verbatim per the sealed brief. */
const MISSION_LEAD =
  "Hi! I'm Filippo, a mechatronics engineer and researcher studying at Yale. Last year an injury stopped my running completely. This is the rebuild, in public.";

/**
 * The mission strip: surfaces THE MISSION on the dashboard itself (previously it
 * lived only behind the #w=journey overlay). Avatar, a mono small-caps name +
 * credential stack, and the mission lead paragraph clamped so the row never
 * grows. The whole card is the shared widget idiom and opens the journey overlay.
 */
export function MissionWidget({ onOpen }: Props) {
  return (
    <WidgetCard
      overlayKey="journey"
      label="the mission"
      onOpen={onOpen}
      bodyClassName="sd-enter flex-row items-center gap-3 p-3 sm:p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/filippo-avatar.png"
        alt="Filippo Fonseca"
        width={40}
        height={40}
        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-sd-line sm:size-10"
      />
      <div className="flex shrink-0 flex-col gap-0.5">
        <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-sd-ink">
          THE MISSION · BY FILIPPO FONSECA
        </span>
        <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-sd-ink-dull">
          PRESIDENT @ YALE ROBOTICS
        </span>
      </div>
      <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-sd-ink-dull lg:line-clamp-2">
        {MISSION_LEAD}
      </p>
    </WidgetCard>
  );
}
