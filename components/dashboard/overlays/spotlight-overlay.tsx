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

/** The Spotlight expand: the latest verified run large, plus other recent runs. */
export function SpotlightOverlay({
  spotlight,
  recent,
}: {
  spotlight: ActivityEvidence | null;
  recent: ActivityEvidence[];
}) {
  const others = spotlight
    ? recent.filter((a) => a.stravaId !== spotlight.stravaId)
    : recent;

  return (
    <div className="flex flex-col gap-6">
      <OverlayHeader
        eyebrow="Latest verified run"
        title={spotlight?.name ?? "No verified runs yet"}
        titleId={overlayTitleId("spotlight")}
      />

      {spotlight ? (
        <>
          {/* Large media */}
          <div className="relative aspect-[16/8] w-full overflow-hidden rounded-sd-card border border-sd-line">
            {spotlight.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={spotlight.photoUrl}
                alt={spotlight.name ?? "Verified run"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <RoutePattern className="h-full w-full" seed={spotlight.stravaId} />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm tracking-wide text-sd-ink-dull sd-numeral">
              {activityStats(spotlight).map((s, i) => (
                <span key={i} className="flex items-center gap-3">
                  {i > 0 ? <span aria-hidden className="text-sd-ink-faint">·</span> : null}
                  {s}
                </span>
              ))}
            </div>
            <VerifiedBadge label="Verified via Strava" />
          </div>

          <StravaLink url={spotlight.activityUrl}>View on Strava</StravaLink>
        </>
      ) : (
        <p className="rounded-sd-card border border-sd-line bg-sd-box/40 px-5 py-10 text-center text-sm text-sd-ink-faint">
          No Strava-linked runs yet. The most recent verified run will appear
          here once the build is underway.
        </p>
      )}

      {others.length > 0 ? (
        <OverlaySection title="Other recent verified runs">
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
