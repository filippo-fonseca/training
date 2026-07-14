# Contributing

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your own Supabase + Strava values
npm run dev
```

See [docs/SETUP.md](docs/SETUP.md) for the full path from a fresh Supabase
project to a running instance, including migrations, seed data, and the
owner account.

## Before you open a PR

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All four should pass. `npm run test` runs the pure-logic unit tests (Strava
matching, OAuth URL building); it needs no network or database.

## Commit style

Small, focused commits. One logical change per commit, with a message that
states what changed and why, not a changelog of every touched file. Follow
the conventions already in the git history (`type(scope): summary`, e.g.
`fix(strava): correct disconnect filter`).

## Design authority

Visual changes follow [docs/DESIGN-BRIEF.md](docs/DESIGN-BRIEF.md). It is the
sealed source of truth for color tokens, elevation, motion, and typography
("Spacedrivey": Spacedrive-style engineered density plus Raycast-style
gradient polish). Do not invent new hex literals or ad hoc styling in
components; use the token names defined there. If a change needs something
the brief does not cover, extend the brief first, then implement from it.

## Writing style

No em dashes or en dashes as punctuation in docs, UI copy, or commit
messages. Use a period, comma, colon, semicolon, or parentheses instead,
whichever actually fits the grammar. Hyphens in compound words (like
"open-source") are fine.
