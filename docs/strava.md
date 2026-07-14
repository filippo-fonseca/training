# Strava integration

Connects the owner's Strava account, pulls recent activities, and matches them to
plan days. The whole area degrades gracefully: with no credentials configured,
`/admin/strava` renders a setup state and nothing crashes.

## Environment variables

All Strava values are **server-side only**. None are `NEXT_PUBLIC_*`; the client
secret never reaches the browser. (This lane's sandbox cannot edit `.env*`, so add
these to `.env.local` and your Vercel project settings yourself.)

| Var | Required | Purpose |
|---|---|---|
| `STRAVA_CLIENT_ID` | yes | Numeric client id from your Strava API application |
| `STRAVA_CLIENT_SECRET` | yes | Client secret (secret! server-side only) |
| `CRON_SECRET` | for cron | Bearer token the scheduled sync route checks. Vercel Cron sends it automatically as `Authorization: Bearer <CRON_SECRET>` |
| `SUPABASE_SERVICE_ROLE_KEY` | for cron | Lets the scheduled cron write activities. The cron has no owner session, so it cannot pass RLS `is_owner()`; it uses this service-role client instead. **Never** expose it to the client. |
| `STRAVA_REDIRECT_URI` | optional | Overrides the OAuth callback URL. Defaults to `<request-origin>/api/strava/callback`, so localhost works with no override. |

## Strava application setup

1. Create an API application at <https://www.strava.com/settings/api>.
2. Set the **Authorization Callback Domain** to your host with no scheme or path:
   - local: `localhost`
   - production: your deployed domain (e.g. `tracker.example.com`)
3. Copy the Client ID and Client Secret into the env vars above.

## OAuth flow

- `/admin/strava` → **Connect Strava** links to `GET /api/strava/authorize`
  (owner-gated). It sets a short-lived CSRF `state` cookie and redirects to Strava
  with scope `read,activity:read_all`.
- Strava redirects to `GET /api/strava/callback`, which validates the state,
  exchanges the code for tokens **server-side**, and stores the connection in
  `strava_connections` (owner-only, RLS). Refresh tokens rotate on every refresh.

## Sync

- **Sync now** (admin) runs on the owner cookie client.
- **Cron** `GET /api/cron/strava-sync` runs daily (see `vercel.json`), secured by
  the `CRON_SECRET` bearer, on the service-role client. Both call the same engine
  (`lib/strava/sync.ts`).
- The activities pull uses `after = max(start_date) − 24h` as its watermark
  (first run pulls the last 60 days). Activities upsert on `strava_id`.

## Matching

Same calendar date (America/New_York) + sport family: Run-type activities match a
day with a run session (or planned running distance); Ride-type match a `bike`
day. At most one activity auto-matches per (day, family); a second run on the same
day is left **Unmatched** for manual linking. Manual link/unlink and re-link/unlink
live on `/admin/strava`.

A matched activity's **Log draft** link hands its distance / moving time / pace /
HR to `/admin/log` as query params to prefill a session log (owned by the session
logging unit).

## Session evidence (linking activities to sessions)

Beyond day matching, activities can be linked to a **plan session** as proof it
was done. Links live in `session_activity_links` (migration 0007): a
many-to-many join between `day_sessions` and `strava_activities`, public
SELECT / owner-only writes, so a track day's several activities can all attach
to one session.

Semantics (derived in `lib/derive/session-evidence.ts`, used by every surface):

- A session with **one or more linked activities is done**, everywhere status is
  computed (day page, calendar, progress, public APIs).
- The session's **actual distance and time are the cumulative totals** across
  its linked activities, never manually entered.
- A manual `session_logs` row remains the **fallback** when nothing is linked;
  linked evidence always takes precedence over it.
- Public surfaces receive only the curated evidence projection (title, photo,
  distance, time, strava id, outbound link); the raw API payload never crosses
  into public props.

The owner links/unlinks on `/admin/log`: each day row has a "Strava evidence"
picker listing synced activities date-proximate first, with multi-select
checkboxes. The public `/day/[date]` page then renders a verification block per
linked activity: the activity photo (when it has one), its title, and an
outbound link to `https://www.strava.com/activities/<id>`.

### Photos and rate limits

The activities **list** endpoint usually omits photo URLs, and Strava's API rate
limits are tight (200 requests / 15 min, 2,000 / day on a default app). Fetching
`GET /activities/{id}` for every synced activity just in case would burn the
budget, so the photo strategy is deliberate:

- The bulk sync stores summary fields only. When a summary does happen to carry
  `photos.primary.urls`, the largest URL is captured via a targeted,
  non-clobbering update (never nulling an existing photo on re-sync).
- The one-time **detail fetch happens at link time**: when the owner links an
  activity to a session, `backfillActivityPhoto` fetches that activity's detail
  once to pull `photos.primary`, so a detail request is spent per **linked**
  activity, not per synced one. Unlinks and re-saves cost nothing.
- Photo backfill is best-effort: a rate-limited or photo-less activity never
  fails the link, and the evidence UI renders a placeholder when no photo
  exists.

## Tests

`npm run test` runs the pure-logic unit tests (matching + OAuth URL + the
session-evidence derivation: cumulative totals and evidence-over-log precedence)
with mocked inputs: no network or DB. Live-verify the full OAuth + sync path once
real Strava credentials are configured.
