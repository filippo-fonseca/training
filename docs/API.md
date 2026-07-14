# Public widget API

Two read-only JSON endpoints for the hyperpolymath.com widget: today's session
and a compact status chip. Both are anon-level reads (RLS-safe by
construction, the same data path the public journey page uses) and never
return health data (symptom tracking, injury notes, Strava tokens). "Today"
is always resolved in `America/New_York`.

## GET /api/public/today

The full snapshot: date, race identity, phase, week, countdown, today's
sessions, status, and a logged summary once one exists.

```json
{
  "date": "2026-07-13",
  "race": {
    "name": "Baystate Half Marathon",
    "distance_km": 21.1,
    "date": "2026-10-18",
    "location": "Lowell, MA"
  },
  "phase": "Return to normal running",
  "week": 1,
  "countdown_days": 97,
  "sessions": [
    {
      "slot": "primary",
      "title": "Easy aerobic run",
      "type": "easy_run",
      "distance_km": 6,
      "duration": "35-40 min",
      "targets": { "pace": "5:45-6:15/km", "rpe": "3-4", "hr": "Zone 2" }
    }
  ],
  "status": "planned",
  "logged": null
}
```

Once a session has been logged, `logged` is populated and `status` becomes
`"logged"` (or `"missed"` if the log was recorded as not completed):

```json
"logged": {
  "distance_km": 6.2,
  "duration_min": 37,
  "pace": "5:58/km",
  "status": "green"
}
```

### Fields

| Field                  | Type                                          | Notes                                             |
| ---------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `date`                 | `string`                                       | `YYYY-MM-DD`, America/New_York                    |
| `race.*`                | `object`                                       | Race identity; nulls before it's set on the plan  |
| `phase`                | `string`                                       | Current phase name                                |
| `week`                 | `number`                                       | Current plan week index (1-based)                 |
| `countdown_days`        | `number`                                       | Days to race day; 0 on race day, negative after    |
| `sessions`             | `array`                                        | Today's primary session, plus secondary if present |
| `sessions[].targets`    | `object`                                       | Free-text pace / RPE / HR guidance, or `null`      |
| `status`               | `"rest" \| "planned" \| "logged" \| "missed"`  | See status derivation below                       |
| `logged`               | `object \| null`                               | Present once a session log exists for today       |
| `logged.status`        | `"green" \| "yellow" \| "red" \| null`         | The logged session's traffic light                |

### Status derivation

- `rest` — no plan day is scheduled for today, or today is an explicit rest day.
- `planned` — a session is scheduled and nothing has been logged yet.
- `logged` — a session log exists and was recorded as completed.
- `missed` — a session log exists but was recorded as not completed.

## GET /api/public/status

The lightweight variant, for a compact widget chip.

```json
{
  "date": "2026-07-13",
  "status": "planned",
  "session_title": "Easy aerobic run",
  "distance_km": 6,
  "countdown_days": 97
}
```

## CORS policy

Both endpoints reflect `Access-Control-Allow-Origin` only for allowlisted
origins; every other origin gets a response with no ACAO header:

- `https://hyperpolymath.com`
- `https://www.hyperpolymath.com`
- `http://localhost:<any port>` and `http://127.0.0.1:<any port>` (dev)

`OPTIONS` preflight requests are handled on both routes.

## Caching

`Cache-Control: public, s-maxage=60, stale-while-revalidate=300` — the CDN
edge may serve a cached response for up to 60 seconds, and a stale one for up
to 5 more minutes while it revalidates in the background.

Known limitation: Next.js's App Router forces its own `Vary` header on every
route-handler response, so this endpoint cannot add `Vary: Origin`. The CDN
cache key does not partition by request origin, so a response cached for one
allowlisted origin could theoretically be served to another allowlisted
origin for up to 60 seconds. The blast radius is narrow (only the two
production hyperpolymath.com origins and local dev are ever allowlisted); if
this becomes a real problem, drop `s-maxage` or move CORS handling in front of
the app (e.g. a platform-level rewrite/header rule).
