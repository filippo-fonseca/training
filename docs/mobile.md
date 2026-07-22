# Mobile (Expo) companion

The React Native app lives in [`mobile/`](../mobile/). It mirrors the public
dashboard and keeps **Admin as a permanent tab** for the single owner.

## How it talks to this backend

| Concern | Path |
|---|---|
| Dashboard / calendar / day / progress / stats / milestones | `GET /api/mobile/*` (public JSON) |
| Strava authorize | `GET /api/mobile/strava/authorize` (Bearer owner JWT) |
| Strava callback | `GET /api/mobile/strava/callback` → deep link `comeback://strava` |
| Sync / auto-link / status / disconnect | `/api/mobile/strava/*` (Bearer) |
| Session logs / health / plans | Direct Supabase from the app (RLS + owner JWT) |

The mobile Strava callback uses an HMAC-signed state (no cookies) and persists
tokens with the service-role client, then redirects into the app. Cron sync and
auto-link continue to run on Vercel as before.

## TestFlight

See [`mobile/README.md`](../mobile/README.md). Point
`EXPO_PUBLIC_API_BASE_URL` at this deployment before building.
