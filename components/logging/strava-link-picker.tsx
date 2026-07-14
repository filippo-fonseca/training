/**
 * Strava evidence picker: multi-select checkbox list of synced activities for
 * one plan session, date-proximate first. Rendered (server-side) inside an
 * EntityForm bound to saveActivityLinks; every checked activity becomes a
 * session_activity_links row, unchecked ones are unlinked. Owner surface only.
 */

import type { StravaActivity } from '@/lib/types/database';
import { nyCalendarDate } from '@/lib/strava/match';
import { englishTitle } from '@/lib/strava/title';
import { formatDate } from '@/app/admin/_lib/format';

interface StravaLinkPickerProps {
  /** The day_session being evidenced (uid for input ids). */
  sessionId: string;
  /** The session's plan-day date (YYYY-MM-DD), for proximity sorting. */
  dayDate: string;
  /** Every synced activity (newest first is fine; we re-sort by proximity). */
  activities: StravaActivity[];
  /** Row ids of activities currently linked to this session. */
  linkedIds: ReadonlySet<string>;
}

/** Days between a plan date and an activity's NY calendar date (for sorting). */
function dayDistance(dayDate: string, activity: StravaActivity): number {
  const actDate = activity.start_date ? nyCalendarDate(activity.start_date) : null;
  if (!actDate) return Number.MAX_SAFE_INTEGER;
  const ms = Math.abs(new Date(dayDate).getTime() - new Date(actDate).getTime());
  return Math.round(ms / 86_400_000);
}

function kmText(m: number | null): string | null {
  return m == null ? null : `${(m / 1000).toFixed(1)} km`;
}

function timeText(s: number | null): string | null {
  if (s == null) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function StravaLinkPicker({ sessionId, dayDate, activities, linkedIds }: StravaLinkPickerProps) {
  if (activities.length === 0) {
    return (
      <p className="text-xs text-sd-ink-faint">
        No synced Strava activities yet. Sync on the Strava page first.
      </p>
    );
  }

  const sorted = [...activities].sort((a, b) => {
    const da = dayDistance(dayDate, a);
    const db = dayDistance(dayDate, b);
    if (da !== db) return da - db;
    // Same proximity: newest first for a stable, sensible order.
    return (b.start_date ?? '').localeCompare(a.start_date ?? '');
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs leading-relaxed text-sd-ink-dull">
        Check every activity that belongs to this session (a track day can be
        several). Linked activities mark the session done and drive its actual
        distance and time.
      </p>
      <ul className="max-h-56 overflow-y-auto rounded-sd-tile border border-sd-line bg-sd-dark-box/60">
        {sorted.map((a) => {
          const uid = `links-${sessionId}-${a.id}`;
          const meta = [
            a.start_date ? formatDate(nyCalendarDate(a.start_date)) : null,
            kmText(a.distance_m),
            timeText(a.moving_time_s),
            a.sport_type,
          ].filter(Boolean) as string[];
          return (
            <li key={a.id} className="border-b border-sd-line/50 last:border-b-0">
              <label
                htmlFor={uid}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-sd-hover"
              >
                <input
                  id={uid}
                  type="checkbox"
                  name="activity_ids"
                  value={a.id}
                  defaultChecked={linkedIds.has(a.id)}
                  className="size-3.5 shrink-0 accent-[var(--sd-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-accent)]"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-medium text-sd-ink">
                    {englishTitle(a.name) ?? 'Activity'}
                  </span>
                  <span className="flex flex-wrap gap-x-2 text-tiny text-sd-ink-faint">
                    {meta.map((m, i) => (
                      <span key={i} className="sd-numeral">
                        {m}
                      </span>
                    ))}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
