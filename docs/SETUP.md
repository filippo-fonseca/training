# Setup

Full path from a fresh Supabase project to a running instance.

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. From **Project Settings → API**, note the project URL and the anon
   (publishable) key. From **Project Settings → API → service_role**, note
   the service role key (only needed for the Strava cron sync, keep it
   server-side only).

## 2. Apply migrations and seed data

Migrations live in `supabase/migrations/`, applied in order:

| File | What it adds |
|---|---|
| `0001_init_schema.sql` | Plan engine schema: plans, phases, weeks, days, sessions, milestones, checkpoints, logs |
| `0002_owner_and_triggers.sql` | `is_owner()` and `updated_at` triggers |
| `0003_rls.sql` | Row-level security on every table |
| `0004_private_plan_notes.sql` | Owner-only private plan notes table |

Apply them with the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file's contents into the Supabase Dashboard's SQL Editor, in
order.

Then seed the plan data:

```bash
psql "<your-connection-string>" -f supabase/seed.sql
```

(or paste `supabase/seed.sql` into the SQL Editor). The seed is idempotent
and safe to re-run. To generate a seed from your own plan document instead
of the bundled Baystate 2026 plan, see `scripts/seed/generate-seed.ts` and
`docs/import-schema.md`.

## 3. Create the owner account

The app is single-owner: exactly one authenticated Supabase user may access
`/admin`. The owner is identified by `ADMIN_EMAIL` (checked at the app layer
before every sign-in attempt) and by `app_settings.admin_email` (the actual
row-level-security boundary, bootstrapped from `ADMIN_EMAIL` on your first
authenticated request, see step 4).

1. In the Supabase Dashboard, go to **Authentication → Users → Add user**.
2. Create a user with the same email you plan to set as `ADMIN_EMAIL`, set a
   password, and check **Auto Confirm User** (the app has no email
   confirmation flow).
3. Sign in at `/login` with that email and password once `ADMIN_EMAIL` is
   set in your environment (step 4).

## 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Var | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon (public) key; RLS makes this safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | preferred over anon key if your project has one | Newer publishable key, same trust level as anon |
| `SUPABASE_SERVICE_ROLE_KEY` | for cron | Server-only; bypasses RLS. Used only by the Strava cron sync route |
| `ADMIN_EMAIL` | yes | The owner's email. Gates `/admin` sign-in and bootstraps `app_settings.admin_email` on first authenticated request |
| `STRAVA_CLIENT_ID` | for Strava | From your Strava API application |
| `STRAVA_CLIENT_SECRET` | for Strava | From your Strava API application, server-only |
| `STRAVA_REDIRECT_URI` | optional | Overrides the derived OAuth callback URL; defaults to `<origin>/api/strava/callback` |
| `CRON_SECRET` | for cron | Bearer token the scheduled sync route checks; generate a long random string |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | optional | Referrer-restricted browser Maps key. When set, the course widget renders a dark Google map of the real course (static image on the card, interactive map in the overlay). When unset, it falls back to the self-contained OpenStreetMap SVG and makes zero external requests |

## 5. Strava API app setup (optional)

1. Create an API application at <https://www.strava.com/settings/api>.
2. Set the **Authorization Callback Domain** to your host, no scheme or
   path: `localhost` for local dev, your deployed domain in production.
3. Copy the Client ID and Client Secret into `STRAVA_CLIENT_ID` and
   `STRAVA_CLIENT_SECRET`.
4. Full flow and matching rules: [docs/strava.md](strava.md).

Without Strava credentials, `/admin/strava` renders a setup state and
nothing else breaks: the integration degrades gracefully.

## 6. Local dev

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000` by default (`PORT=4000 npm run dev` to use
another port).

## 7. Deploy to Vercel

1. Import the repo into [Vercel](https://vercel.com).
2. Add every variable from step 4 as a Vercel project environment variable
   (Production and Preview as needed).
3. `vercel.json` already declares the daily Strava sync cron
   (`/api/cron/strava-sync`, 06:00 UTC); Vercel Cron picks it up on deploy,
   no extra configuration needed. The route is secured by `CRON_SECRET`,
   which Vercel Cron sends automatically as `Authorization: Bearer
   <CRON_SECRET>`.

## Known dev-only quirk

Under `next dev` only (not `next build`/production), signing in can
occasionally 500 with a "cookies() was called outside a request scope"
error on the first request after a cold start. Reloading `/login` and
signing in again clears it. This does not reproduce in a production
(`next build && next start`) run; if you hit it, it is safe to ignore in
local development.
