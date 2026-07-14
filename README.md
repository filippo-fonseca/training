# training-tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A single-owner running training tracker: a structured plan engine, daily
session logging, a Strava-synced admin console, and a public read-only widget
API. Built to run one specific comeback (Baystate Half Marathon, October
2026) and generalized so the plan engine works for any race and any plan.
Read the day, log the day, watch the countdown.

## Features

- **Plan engine** — phases, weeks, and days with structured targets (pace
  ranges, distances) plus the original prescription text, never lossy.
- **Daily journey view** — "today" resolved in America/New_York, with
  status derivation (rest / planned / logged / missed).
- **Session logging** — traffic-light outcomes (green / yellow / red) with
  free-text targets carried through from the plan.
- **Strava integration** — OAuth connect, daily cron sync, and automatic
  same-day/same-sport matching to plan sessions, with manual link/unlink as
  a fallback.
- **Admin console** — single-owner auth gated by an authenticated Supabase
  session, plan import, and app settings.
- **Public widget API** — anon-level, RLS-safe JSON endpoints for an
  external site widget (see [docs/API.md](docs/API.md)).

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) (Postgres, auth, row-level security)
- [Tailwind CSS 4](https://tailwindcss.com)
- Deployed on [Vercel](https://vercel.com), with Vercel Cron for the
  scheduled Strava sync

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + Strava values
npm run dev                  # http://localhost:3000
```

This gets the app running against a Supabase project. For the full setup
(creating that project, applying migrations, seeding the plan, creating the
owner account, wiring Strava, and deploying to Vercel with cron), see
**[docs/SETUP.md](docs/SETUP.md)**.

## Docs

- [docs/SETUP.md](docs/SETUP.md) — full setup guide, from a fresh Supabase
  project to a deployed instance.
- [docs/API.md](docs/API.md) — the public widget API (read-only, anon-safe).
- [docs/strava.md](docs/strava.md) — Strava integration details: OAuth flow,
  sync watermark, and matching rules.

## Security model

The app is single-owner. There is no per-row `user_id`; authorization is
"are you the configured owner?", enforced by Postgres row-level security
(`is_owner()`), not by application code. The browser only ever holds the
public (anon/publishable) Supabase key, which RLS makes safe to expose. The
service-role key is used only by the server-only Strava cron sync, which has
no user session to authenticate with.

## License

[MIT](LICENSE) — see the LICENSE file.
