"use client";

import type { ActivityEvidence } from "@/lib/derive";
import {
  activityDateShort,
  kmLabel,
  paceLabel,
  timeLabel,
  type OverlayKey,
} from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";
import { VerifiedBadge } from "../verified-badge";
import { RoutePattern } from "../route-pattern";

interface Props {
  spotlight: ActivityEvidence | null;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/**
 * The dominant card: the most recent verified (linked) activity. With a Strava
 * photo it is full-bleed media under a bottom-up scrim that guarantees AA text
 * contrast; without one it shows a generated route pattern (never an empty
 * box). The actual outbound Strava link lives in the expanded overlay to keep
 * the card a single interactive target. Expands to the activity detail.
 */
export function SpotlightWidget({ spotlight, onOpen }: Props) {
  const hasPhoto = !!spotlight?.photoUrl;
  const km = spotlight ? kmLabel(spotlight.distanceM) : null;
  const pace = spotlight ? paceLabel(spotlight.distanceM, spotlight.movingTimeS) : null;
  const time = spotlight ? timeLabel(spotlight.movingTimeS) : null;
  const date = spotlight ? activityDateShort(spotlight.startDate) : null;
  const stats = [km, pace, time, date].filter(Boolean) as string[];

  return (
    <WidgetCard
      overlayKey="spotlight"
      label="latest verified run"
      onOpen={onOpen}
      bodyClassName="p-0"
    >
      {/* Media layer */}
      <div className="absolute inset-0 -z-0">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={spotlight!.photoUrl!}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <RoutePattern
            className="h-full w-full"
            seed={spotlight?.stravaId ?? 7}
          />
        )}
        {/* Bottom-up AA scrim */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--sd-scrim)" }}
        />
      </div>

      {/* Content over the scrim */}
      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <WidgetLabel>Latest run</WidgetLabel>
          {spotlight ? <VerifiedBadge label="Verified via Strava" /> : null}
        </div>

        <div className="flex flex-col gap-2">
          {spotlight ? (
            <>
              <h2 className="line-clamp-2 font-sans font-semibold leading-tight tracking-tight text-sd-ink" style={{ fontSize: "clamp(1.25rem, 2.1vw, 1.6rem)" }}>
                {spotlight.name ?? "Verified run"}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tracking-wide text-sd-ink-dull sd-numeral">
                {stats.map((s, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 ? <span aria-hidden className="text-sd-ink-faint">·</span> : null}
                    {s}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-sans text-xl font-semibold leading-tight tracking-tight text-sd-ink">
                No verified runs yet
              </h2>
              <p className="max-w-sm text-xs text-sd-ink-dull">
                The most recent verified run will spotlight here once one is
                linked from Strava.
              </p>
            </>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
