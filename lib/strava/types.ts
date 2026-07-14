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
  [key: string]: unknown;
}
