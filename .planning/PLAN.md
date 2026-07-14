# Plan — Strava integration (unit-strava-integration-acae)

Validated against the worktree. Seed (`fable-plan.md`) followed; D3 (no webhooks)
respected; oracle "degrade gracefully when creds empty" honored throughout.

## Existing surface (already present, reuse)
- Tables `strava_connections` (PRIVATE, owner-only RLS) and `strava_activities`
  (CURATED: anon read, owner write) exist in `0001_init_schema.sql` + `0003_rls.sql`.
- Types for both already in `lib/types/database.ts`.
- `getStravaActivities()` already in `lib/db/queries.ts`.
- Auth: `requireOwner()` gate; cookie-backed owner client via
  `createServerSupabaseClient()`. `is_owner()` = JWT email == ADMIN_EMAIL.
- Admin nav has a `pending` Strava entry at `/admin/strava`.
- `/admin/log` does NOT exist yet (later unit) — prefill is a link only.

## Key architectural decision (assumption A1)
The Vercel cron route has **no user session**, so RLS `is_owner()` blocks its
reads of `strava_connections` and writes to `strava_activities`. Therefore the
cron path uses a **service-role Supabase client**, server-only and env-gated
(`SUPABASE_SERVICE_ROLE_KEY`), never imported into any client bundle. The
interactive path (OAuth callback, Sync now, manual link/unlink) keeps using the
owner **cookie** client, so `is_owner()` remains the boundary there and the
service role is confined to the secured cron surface. If the service-role key is
absent, cron returns `200 { status: 'not configured' }`.

## Watermark (assumption A2)
No schema change: the `after` timestamp for the activities pull is derived from
`max(start_date)` of already-synced `strava_activities` (with a 24h overlap for
safety; upsert on `strava_id` dedups). First sync with no rows pulls a bounded
recent window (default 60 days). Keeps the change within the unit's touched globs.

## Files
- `lib/strava/config.ts` — env (`STRAVA_CLIENT_ID/SECRET`, redirect derivation,
  `CRON_SECRET`), `stravaConfigured()`. Server-only. No NEXT_PUBLIC.
- `lib/strava/types.ts` — Strava API response types.
- `lib/strava/oauth.ts` — authorize URL builder, `exchangeCode`, `refreshTokens`.
- `lib/strava/api.ts` — `StravaApi` (ensure-fresh-token + `listActivities(after)`).
- `lib/strava/service.ts` — `createStravaServiceClient()` → service-role client | null.
- `lib/strava/db.ts` — connection + activity DB helpers (client-injected).
- `lib/strava/match.ts` — PURE: sport family map, NY calendar date, matcher.
- `lib/strava/sync.ts` — `runStravaSync(client)` orchestration + result summary.
- `lib/strava/index.ts` — barrel (server-only exports).
- `app/api/strava/authorize/route.ts` — owner-gated → redirect to Strava, state cookie.
- `app/api/strava/callback/route.ts` — validate state+owner, exchange, store, redirect.
- `app/api/cron/strava-sync/route.ts` — CRON_SECRET bearer, service-role sync.
- `app/admin/strava/page.tsx` — setup / connected states, activity lists.
- `app/admin/strava/actions.ts` — `syncNow`, `linkActivity`, `unlinkActivity`, `disconnect`.
- `app/admin/strava/_components/*` — small client bits (submit pending states).
- `lib/strava/match.test.ts`, `lib/strava/oauth.test.ts` — `node --test` + tsx.
- `vercel.json` — daily cron `/api/cron/strava-sync`.
- `components/admin/admin-nav.tsx` — drop `pending` on Strava.
- `package.json` — add `test` script.
- `docs/strava.md` — required env + local callback setup (can't touch `.env.example`; secret-blocked).

## Matching rules
Same NY calendar date + sport family. RUN family (sport_type contains "Run") ↔
day has a run session (easy_run/long_run/quality_run/race) or planned_run_km>0.
RIDE family (contains "Ride"/"Bike") ↔ day has a `bike` session. At most one
auto-match per (day, family); extra same-day/same-family activities → unmatched
(manual). Only the default/active plan's days are matched.

## Verification
`npm run typecheck`, `npm run build`, `npm run test` (mocked Strava responses).
Live-verify once real creds land (note readiness in control file).
