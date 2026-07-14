// Strava REST client — SERVER-ONLY. Just the athlete-activities read we need,
// paged defensively and best-effort rate-limit aware.

import { STRAVA_API_BASE } from './config';
import type { StravaSummaryActivity, StravaDetailActivity } from './types';

export class StravaApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'StravaApiError';
  }
}

export interface ListActivitiesOptions {
  /** Unix seconds; only activities after this instant are returned. */
  after?: number;
  perPage?: number;
  /** Safety cap on pages fetched in a single sync. */
  maxPages?: number;
}

/**
 * GET /athlete/activities, paging until a short page or the page cap. Returns
 * newest-or-oldest as Strava orders them (default: newest first, but with
 * `after` set Strava returns oldest-first within the window). We collect all and
 * let the caller upsert.
 */
export async function listActivities(
  accessToken: string,
  opts: ListActivitiesOptions = {},
): Promise<StravaSummaryActivity[]> {
  const perPage = Math.min(Math.max(opts.perPage ?? 100, 1), 200);
  const maxPages = Math.min(Math.max(opts.maxPages ?? 5, 1), 20);
  const all: StravaSummaryActivity[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const q = new URLSearchParams({ per_page: String(perPage), page: String(page) });
    if (opts.after && opts.after > 0) q.set('after', String(Math.floor(opts.after)));

    const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${q.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (res.status === 429) {
      // Rate limited: stop early and keep what we have rather than hammering.
      throw new StravaApiError('Strava rate limit hit (429)', 429);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new StravaApiError(
        `Strava activities returned ${res.status}: ${body.slice(0, 200)}`,
        res.status,
      );
    }

    const batch = (await res.json()) as StravaSummaryActivity[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break; // last page
  }

  return all;
}

/**
 * GET /activities/{id}: the detail activity, which includes `photos.primary`.
 * Used ONLY when linking an activity to a session (so we spend a detail request
 * per linked activity, not per synced activity) to respect Strava's rate limits.
 * See docs/strava.md. Returns null on 404 (deleted/private activity).
 */
export async function getActivity(
  accessToken: string,
  stravaId: number,
): Promise<StravaDetailActivity | null> {
  const res = await fetch(
    `${STRAVA_API_BASE}/activities/${stravaId}?include_all_efforts=false`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  );
  if (res.status === 404) return null;
  if (res.status === 429) throw new StravaApiError('Strava rate limit hit (429)', 429);
  if (!res.ok) {
    const body = await res.text();
    throw new StravaApiError(
      `Strava activity ${stravaId} returned ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }
  return (await res.json()) as StravaDetailActivity;
}
