// Shapes of the Strava API responses we consume. Only the fields we read are
// typed; Strava returns much more, which we keep verbatim in the `raw` column.

/** Token endpoint response (authorization_code and refresh_token grants). */
export interface StravaTokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  /** Unix seconds at which the access token expires. */
  expires_at: number;
  expires_in: number;
  scope?: string;
  athlete?: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  profile?: string | null;
  city?: string | null;
  country?: string | null;
  [key: string]: unknown;
}

/**
 * A photo attached to an activity. `urls` maps a size (px string) to a URL,
 * e.g. `{ "100": "...", "600": "..." }`. The list endpoint usually omits photo
 * URLs; the detail endpoint (GET /activities/{id}) returns `photos.primary`.
 */
export interface StravaPhoto {
  urls?: Record<string, string> | null;
}

/** A summary activity from GET /athlete/activities. */
export interface StravaSummaryActivity {
  id: number;
  name: string;
  /** e.g. "Run", "TrailRun", "Ride", "VirtualRide", "Walk". */
  sport_type: string;
  /** Legacy field; present on older activities. */
  type?: string;
  /** UTC ISO-8601, e.g. "2026-07-13T11:00:00Z". */
  start_date: string;
  start_date_local?: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  average_speed?: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  map?: { summary_polyline?: string | null } | null;
  /** Present on the detail endpoint; occasionally on summaries. */
  photos?: { primary?: StravaPhoto | null; count?: number } | null;
  [key: string]: unknown;
}

/** The detail activity from GET /activities/{id}. Superset of the summary; we
 *  fetch it only to obtain the primary photo when linking (rate-limit aware). */
export type StravaDetailActivity = StravaSummaryActivity;

/**
 * Best (largest) primary photo URL for an activity, or null when it has none.
 * Strava keys `photos.primary.urls` by pixel size as strings; pick the largest.
 */
export function primaryPhotoUrl(activity: StravaSummaryActivity): string | null {
  const urls = activity.photos?.primary?.urls;
  if (!urls) return null;
  const entries = Object.entries(urls).filter(([, url]) => typeof url === 'string' && url.length > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => (Number.parseInt(b[0], 10) || 0) - (Number.parseInt(a[0], 10) || 0));
  return entries[0][1];
}
