"use client";

import type { OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard } from "../widget-card";

interface Props {
  label: string;
  value: string;
  caption: string;
  overlayKey: OverlayKey;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/** A single stat tile: mono label over a big Grotesk numeral + a dull caption. */
export function StatTile({ label, value, caption, overlayKey, onOpen }: Props) {
  return (
    <WidgetCard
      overlayKey={overlayKey}
      label={label}
      onOpen={onOpen}
      bodyClassName="justify-center gap-0.5 p-3 sm:p-4"
    >
      <span className="sd-stat-label">{label}</span>
      <span
        className="font-sans font-bold leading-none tracking-tight text-sd-ink"
        style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.25rem)" }}
      >
        {value}
      </span>
      <span className="truncate text-tiny text-sd-ink-faint">{caption}</span>
    </WidgetCard>
  );
}
