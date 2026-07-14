import { Panel } from '@/components/ui/panel';
import { cumulativeEvidence, type ActivityEvidence } from '@/lib/derive';
import { accentChip } from './status';
import { formatKm, formatDuration } from './format';

interface SessionEvidenceProps {
  /** Linked Strava activities for this day/session. Renders nothing when empty. */
  evidence: ActivityEvidence[];
}

/**
 * Public verification block: proof, per the owner's spec, that the session was
 * actually done. Shows a "Verified via Strava" badge with the cumulative totals
 * across every linked activity, then each activity's photo (when present), its
 * title, and an outbound link to the activity on strava.com. Only curated,
 * public-safe fields are used (ActivityEvidence); no raw payload or private data.
 */
export function SessionEvidence({ evidence }: SessionEvidenceProps) {
  if (evidence.length === 0) return null;
  const cum = cumulativeEvidence(evidence);
  const many = evidence.length > 1;

  return (
    <Panel padded className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex w-fit items-center gap-1.5 rounded-sd-chrome border px-2 py-0.5 text-tiny font-semibold uppercase tracking-[0.1em]"
          style={accentChip}
        >
          <StravaGlyph />
          Verified via Strava
        </span>
        <div className="flex items-center gap-x-3 text-tiny text-sd-ink-faint">
          {many ? (
            <span className="sd-numeral">
              {evidence.length} activities
            </span>
          ) : null}
          {cum.distanceKm != null ? <span className="sd-numeral">{formatKm(cum.distanceKm)}</span> : null}
          {cum.movingTimeS != null ? <span className="sd-numeral">{formatDuration(cum.movingTimeS)}</span> : null}
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {evidence.map((a) => (
          <li key={a.stravaId}>
            <EvidenceCard activity={a} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function EvidenceCard({ activity }: { activity: ActivityEvidence }) {
  const meta = [
    activity.distanceM != null ? formatKm(activity.distanceM / 1000) : null,
    activity.movingTimeS != null ? formatDuration(activity.movingTimeS) : null,
    activity.sportType,
  ].filter(Boolean) as string[];

  return (
    <a
      href={activity.activityUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="sd-soft-hover group flex items-stretch gap-3 overflow-hidden rounded-sd-tile border border-sd-line bg-sd-box/50 p-2 outline-none hover:border-sd-selected focus-visible:ring-2 focus-visible:ring-[var(--sd-accent)]"
    >
      {activity.photoUrl ? (
        // Plain img: the photo is an external Strava CDN URL. Curated, public-safe.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activity.photoUrl}
          alt=""
          loading="lazy"
          className="size-16 shrink-0 rounded-[6px] border border-sd-frame object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-[6px] border border-sd-frame bg-sd-dark-box text-sd-ink-faint"
        >
          <StravaGlyph width={18} height={18} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span className="truncate text-sm font-medium text-sd-ink group-hover:text-sd-accent-faint">
          {activity.name ?? 'Strava activity'}
        </span>
        {meta.length > 0 ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-tiny text-sd-ink-faint">
            {meta.map((m, i) => (
              <span key={i} className="sd-numeral">
                {m}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      <span
        aria-hidden
        className="mr-1 grid shrink-0 place-items-center self-center text-sd-ink-faint transition-colors duration-150 group-hover:text-sd-accent-faint"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17L17 7M17 7H8M17 7v9" />
        </svg>
      </span>
    </a>
  );
}

/** The Strava mark, monochrome (inherits currentColor) so it stays on-token. */
function StravaGlyph({ width = 12, height = 12 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
