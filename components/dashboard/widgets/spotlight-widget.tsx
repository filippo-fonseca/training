"use client";

import { useCallback, type KeyboardEvent } from "react";
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
import { BrowseControls, ResetChip } from "./browse-controls";

interface Props {
  /** Every verified (linked) run, newest first, for prev/next browsing. */
  verified: ActivityEvidence[];
  /** The currently browsed run's strava id (owned by the shell); null = latest. */
  selectedId: number | null;
  onSelectRun: (stravaId: number) => void;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

/**
 * The dominant card: a verified (linked) run browser. Defaults to the most
 * recent verified run and renders it exactly as before (full-bleed Strava photo
 * under an AA scrim, or a generated route pattern; stat row; Verified badge).
 * The header chevrons (and Left/Right arrow keys while focused) walk to older /
 * newer verified runs, newest first. The outbound Strava link lives in the
 * expanded overlay, which follows the selection. Expands to the activity detail.
 */
export function SpotlightWidget({ verified, selectedId, onSelectRun, onOpen }: Props) {
  const latestId = verified[0]?.stravaId ?? null;
  const index =
    selectedId != null ? verified.findIndex((a) => a.stravaId === selectedId) : 0;
  const selected = index >= 0 ? verified[index] : verified[0] ?? null;
  const canPrev = index > 0; // a newer run exists
  const canNext = index >= 0 && index < verified.length - 1; // an older run exists
  const isLatest = selected != null && selected.stravaId === latestId;

  const goPrev = useCallback(() => {
    if (canPrev) onSelectRun(verified[index - 1].stravaId);
  }, [canPrev, verified, index, onSelectRun]);
  const goNext = useCallback(() => {
    if (canNext) onSelectRun(verified[index + 1].stravaId);
  }, [canNext, verified, index, onSelectRun]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext],
  );

  const hasPhoto = !!selected?.photoUrl;
  const km = selected ? kmLabel(selected.distanceM) : null;
  const pace = selected ? paceLabel(selected.distanceM, selected.movingTimeS) : null;
  const time = selected ? timeLabel(selected.movingTimeS) : null;
  const date = selected ? activityDateShort(selected.startDate) : null;
  const stats = [km, pace, time, date].filter(Boolean) as string[];

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="relative h-full" onKeyDown={onKeyDown}>
      <WidgetCard
        overlayKey="spotlight"
        label="the verified runs"
        onOpen={onOpen}
        bodyClassName="p-0"
      >
        {/* Media layer, re-keyed so it replays the entrance on each browse. */}
        <div key={selected?.stravaId ?? "empty"} className="sd-enter absolute inset-0 -z-0">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected!.photoUrl!}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <RoutePattern className="h-full w-full" seed={selected?.stravaId ?? 7} />
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
          <div className="flex items-center gap-2 pr-24">
            <WidgetLabel>{isLatest ? "Latest run" : "Verified run"}</WidgetLabel>
            {selected ? <VerifiedBadge label="Verified via Strava" /> : null}
          </div>

          <div key={selected?.stravaId ?? "empty-body"} className="sd-enter flex flex-col gap-2">
            {selected ? (
              <>
                <h2 className="line-clamp-2 font-sans font-semibold leading-tight tracking-tight text-sd-ink" style={{ fontSize: "clamp(1.25rem, 2.1vw, 1.6rem)" }}>
                  {selected.name ?? "Verified run"}
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

      {/* Browse controls: shown even with 0/1 runs (disabled but honest). */}
      <BrowseControls
        reset={
          !isLatest && latestId != null ? (
            <ResetChip onClick={() => onSelectRun(latestId)}>Latest</ResetChip>
          ) : undefined
        }
        canPrev={canPrev}
        canNext={canNext}
        onPrev={goPrev}
        onNext={goNext}
        prevLabel="Previous run"
        nextLabel="Next run"
      />
    </div>
  );
}
