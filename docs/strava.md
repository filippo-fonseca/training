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
day. At most one activity auto-matches per (day, family) — a second run on the same
day is left **Unmatched** for manual linking. Manual link/unlink and re-link/unlink
live on `/admin/strava`.

A matched activity's **Log draft** link hands its distance / moving time / pace /
HR to `/admin/log` as query params to prefill a session log (owned by the session
logging unit).

## Tests

`npm run test` runs the pure-logic unit tests (matching + OAuth URL) with mocked
inputs — no network or DB. Live-verify the full OAuth + sync path once real Strava
credentials are configured.
