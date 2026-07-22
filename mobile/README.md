# The Comeback (mobile)

React Native + Expo companion for the training tracker. Same dark Spacedrivey
UI as the web app, with **Admin as a first-class tab** (single-owner).

## Tabs

1. **Home** — dashboard (countdown, today, week, spotlight, stats)
2. **Calendar** — month grid + day detail
3. **Progress** — weekly / cumulative km
4. **More** — stats + milestones
5. **Admin** — plan, log, health, Strava, import, settings (always available)

## Setup

```bash
cd mobile
cp .env.example .env
# fill EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
# EXPO_PUBLIC_API_BASE_URL (your Vercel origin), EXPO_PUBLIC_OWNER_EMAIL
npm start
```

## TestFlight

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview
eas submit --platform ios
```

Strava OAuth for the app uses the web API at
`/api/mobile/strava/*` (Bearer session). Add the production API host as the
Strava Authorization Callback Domain (same as the web app). The mobile
callback path is `/api/mobile/strava/callback`, which deep-links back into
the app via the `comeback://` scheme.

## Env

See `.env.example`. Never put `STRAVA_CLIENT_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`, or `CRON_SECRET` in the mobile app.
