"use client";

import type { ActivityEvidence } from "@/lib/derive";
import {
  activityDateShort,
  kmLabel,
  paceLabel,
  timeLabel,
} from "../data";
import { RoutePattern } from "../route-pattern";
import { VerifiedBadge } from "../verified-badge";
import { OverlayHeader, OverlayFooter, OverlaySection, overlayTitleId } from "./overlay-chrome";

function StravaLink({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sd-accent transition-colors hover:text-[color:var(--strava)]"
    >
      {children}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  );
}

function activityStats(a: ActivityEvidence): string[] {
  return [
    kmLabel(a.distanceM),
    paceLabel(a.distanceM, a.movingTimeS),
    timeLabel(a.movingTimeS),
    activityDateShort(a.startDate),
  ].filter(Boolean) as string[];
}

/**
 * The Spotlight expand for a browsed (non-latest) verified run: the same shape
 * as the server SpotlightOverlay, but rendered by the client shell so the large
 * media, the stat row, and the outbound Strava link all follow the selected run.
 * Lists the other verified runs beneath it. Client-safe (only pure formatters).
 */
export function SpotlightBrowseOverlay({
  selected,
  all,
}: {
  selected: ActivityEvidence;
  all: ActivityEvidence[];
}) {
  const others = all.filter((a) => a.stravaId !== selected.stravaId);

  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow="Verified run"
        title={selected.name ?? "Verified run"}
        titleId={overlayTitleId("spotlight")}
      />

      <div className="relative aspect-[16/8] w-full overflow-hidden rounded-sd-card border border-sd-line">
        {selected.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.photoUrl}
            alt={selected.name ?? "Verified run"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <RoutePattern className="h-full w-full" seed={selected.stravaId} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm tracking-wide text-sd-ink-dull sd-numeral">
          {activityStats(selected).map((s, i) => (
            <span key={i} className="flex items-center gap-3">
              {i > 0 ? <span aria-hidden className="text-sd-ink-faint">·</span> : null}
              {s}
            </span>
          ))}
        </div>
        <VerifiedBadge label="Verified via Strava" />
      </div>

      <StravaLink url={selected.activityUrl}>View on Strava</StravaLink>

      {others.length > 0 ? (
        <OverlaySection title="Other verified runs">
          <ul className="flex flex-col gap-2">
            {others.map((a) => (
              <li
                key={a.stravaId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-sd-tile border border-sd-line bg-sd-box/40 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-sd-ink">
                  {a.name ?? "Verified run"}
                </span>
                <span className="sd-numeral text-tiny text-sd-ink-faint">
                  {activityStats(a).join(" · ")}
                </span>
                <StravaLink url={a.activityUrl}>Strava</StravaLink>
              </li>
            ))}
          </ul>
        </OverlaySection>
      ) : null}

      <OverlayFooter />
    </div>
  );
}
