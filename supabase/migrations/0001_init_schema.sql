-- =============================================================================
-- 0001_init_schema.sql
-- General plan-engine schema for the training tracker.
--
-- Design notes
--  * The engine is plan-agnostic: `plans` is the root, everything hangs off it.
--    The Baystate 2026 half-marathon plan is one row of seed data, not a
--    hardcoded assumption. Race distance is a field, never "marathon".
--  * Targets are RANGES OR FREE TEXT in the source. We store BOTH the structured
--    fields (pace seconds/km min+max, distance_km numeric) AND the original
--    prescription/target text. Parsing is never lossy: the raw text always wins.
--  * Runs are distance-based, bike sessions duration-based, rest days neither:
--    distance_km and the duration fields are all nullable.
--  * Dates are DATE columns with no timezone. "Today" is resolved app-side in
--    America/New_York.
--  * Idempotent: safe to re-run. `create table if not exists`, guarded enum
--    creation, `create or replace` functions (in later migrations).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums (guarded so the migration is re-runnable)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.session_slot as enum ('primary', 'secondary');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Broad taxonomy over the 44 distinct primary session names.
  create type public.session_category as enum (
    'easy_run', 'long_run', 'quality_run', 'bike', 'strength_only', 'rest', 'race'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alternative_gate as enum ('green', 'yellow', 'red');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.traffic_light as enum ('green', 'yellow', 'red');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.milestone_type as enum (
    'decision_checkpoint', 'gated_long_run', 'key_workout',
    'taper_start', 'race', 'cutback_week', 'post_race'
  );
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- app_settings — key/value bootstrap config (owner-only). Holds admin_email,
-- which is_owner() reads to identify the single owner.
-- -----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- plans — root of the engine. One row per training plan.
-- -----------------------------------------------------------------------------
create table if not exists public.plans (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  version           integer not null default 1,
  prepared_on       date,
  status            text not null default 'active',   -- active | archived | draft
  -- Athlete (single-owner app, but kept as plan-scoped fields for generality)
  athlete_name      text,
  athlete_age       integer,
  athlete_notes     text,
  -- Race
  race_name         text,
  race_distance_km  numeric(6,2),
  race_date         date,
  race_start_time   time,
  race_location     text,
  race_course_notes text,
  -- Plan span + narrative
  start_date        date,
  end_date          date,
  total_planned_km  numeric(7,2),
  north_star        text,
  plan_logic        text,
  medical_notes     text,
  -- Goal selection (A/B/C) kept as free text; selection is symptom/evidence gated
  goal_a            text,
  goal_b            text,
  goal_c            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- plan_phases — training blocks spanning one or more weeks.
-- -----------------------------------------------------------------------------
create table if not exists public.plan_phases (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.plans (id) on delete cascade,
  phase_index   integer not null,
  name          text not null,
  start_week    integer,
  end_week      integer,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (plan_id, phase_index)
);

-- -----------------------------------------------------------------------------
-- plan_weeks — one row per plan week (14 for Baystate).
-- -----------------------------------------------------------------------------
create table if not exists public.plan_weeks (
  id                 uuid primary key default gen_random_uuid(),
  plan_id            uuid not null references public.plans (id) on delete cascade,
  phase_id           uuid references public.plan_phases (id) on delete set null,
  week_index         integer not null,
  start_date         date,
  end_date           date,
  phase_label        text,
  planned_km         numeric(6,2),
  range_min_km       numeric(6,2),
  range_max_km       numeric(6,2),
  previous_text      text,            -- e.g. "rehab", "16.0 km"
  pct_change_text    text,            -- e.g. "+25%", "baseline"
  run_days           integer,
  long_run_km        numeric(6,2),
  coaching_note      text,
  performance_target text,
  injury_target      text,
  bike_note          text,            -- e.g. "up to 2.50 h as scheduled"
  strength_note      text,            -- e.g. "5 sessions, lower work subfailure"
  is_cutback         boolean not null default false,
  is_taper           boolean not null default false,
  is_race_week       boolean not null default false,
  is_peak            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (plan_id, week_index)
);

-- -----------------------------------------------------------------------------
-- plan_days — one row per day (98 for Baystate). Countdown/cumulative fields
-- are stored because the source doc precomputes them; treat as denormalized.
-- -----------------------------------------------------------------------------
create table if not exists public.plan_days (
  id              uuid primary key default gen_random_uuid(),
  plan_id         uuid not null references public.plans (id) on delete cascade,
  week_id         uuid not null references public.plan_weeks (id) on delete cascade,
  date            date not null,
  weekday         text,
  day_index       integer not null,   -- 1..98
  days_to_race    integer,
  week_number     integer,
  phase_label     text,
  planned_run_km  numeric(6,2) not null default 0,  -- today's run km (0 on non-run days)
  cumulative_km   numeric(7,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (plan_id, date),
  unique (plan_id, day_index)
);

-- -----------------------------------------------------------------------------
-- day_sessions — two slots per day: a primary session + a secondary training
-- item (strength template / mobility / rest / logistics). The primary slot
-- carries the full attribute richness; the secondary slot names a template.
-- -----------------------------------------------------------------------------
create table if not exists public.day_sessions (
  id                   uuid primary key default gen_random_uuid(),
  plan_day_id          uuid not null references public.plan_days (id) on delete cascade,
  slot                 public.session_slot not null,
  title                text not null,               -- session name (primary) / template name (secondary)
  category             public.session_category,     -- primary only
  is_quality           boolean not null default false,
  role                 text,                         -- "today's role" rationale (primary)
  prescription_text    text,                         -- exact prescription; may embed G/Y/R alternatives
  -- Targets: structured + raw
  distance_km          numeric(6,2),                 -- runs only; null for bike/rest
  duration_text        text,                         -- "55-60 min", "45 min total"
  duration_min_minutes integer,                      -- parsed lower bound, nullable
  duration_max_minutes integer,                      -- parsed upper bound, nullable
  pace_text            text,                         -- "5:05-5:40/km", "Bike by RPE", "n/a"
  pace_min_s_per_km    integer,                      -- parsed, nullable
  pace_max_s_per_km    integer,                      -- parsed, nullable
  rpe_text             text,                         -- "2/10", "7-8/10 on reps"
  hr_text              text,                         -- "usually 135-158 bpm ...", "n/a"
  terrain              text,
  cue                  text,
  fuel                 text,
  shoes                text,
  completion_planned   text,                         -- restated planned distance/pace/RPE
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (plan_day_id, slot)
);

-- -----------------------------------------------------------------------------
-- day_alternatives — green/yellow/red alternative prescriptions for symptom-
-- gated days ("GREEN GATE ONLY / Yellow: 16-18 km / Red: no run").
-- -----------------------------------------------------------------------------
create table if not exists public.day_alternatives (
  id            uuid primary key default gen_random_uuid(),
  plan_day_id   uuid not null references public.plan_days (id) on delete cascade,
  gate          public.alternative_gate not null,
  prescription  text not null,
  distance_km   numeric(6,2),
  created_at    timestamptz not null default now(),
  unique (plan_day_id, gate)
);

-- -----------------------------------------------------------------------------
-- milestones — key events across the plan (gated runs, peak workouts, cutbacks,
-- taper start, race, post-race), with optional traffic-light gate criteria.
-- -----------------------------------------------------------------------------
create table if not exists public.milestones (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.plans (id) on delete cascade,
  milestone_index  integer not null,
  type             public.milestone_type not null,
  title            text not null,
  date             date,
  week_number      integer,
  description      text,
  green_criteria   text,
  yellow_criteria  text,
  red_criteria     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (plan_id, milestone_index)
);

-- -----------------------------------------------------------------------------
-- checkpoints — the formal decision checkpoints (traffic-light governance):
-- after weeks 3, 7, 9, 12. Each has green/yellow/red actions.
-- -----------------------------------------------------------------------------
create table if not exists public.checkpoints (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references public.plans (id) on delete cascade,
  checkpoint_index  integer not null,
  title             text not null,
  after_week        integer,
  green_action      text,
  yellow_action     text,
  red_action        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (plan_id, checkpoint_index)
);

-- -----------------------------------------------------------------------------
-- session_logs — the athlete's actual results. PUBLIC read (sealed D1: logged
-- results are part of the journey). Owner-only writes.
-- -----------------------------------------------------------------------------
create table if not exists public.session_logs (
  id                   uuid primary key default gen_random_uuid(),
  plan_id              uuid not null references public.plans (id) on delete cascade,
  plan_day_id          uuid not null references public.plan_days (id) on delete cascade,
  logged_at            timestamptz not null default now(),
  actual_distance_km   numeric(6,2),
  actual_duration_min  numeric(6,1),
  actual_pace_text     text,
  actual_rpe           integer,
  completed            boolean not null default false,
  modified             boolean not null default false,
  why_modified         text,
  tomorrow_change      text,
  traffic_light        public.traffic_light,
  shoe_used            text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (plan_day_id)
);

-- -----------------------------------------------------------------------------
-- health_entries — injury checkpoint + recovery tracking. PRIVATE: owner-only
-- for every operation, including SELECT. Never publicly readable.
-- -----------------------------------------------------------------------------
create table if not exists public.health_entries (
  id                 uuid primary key default gen_random_uuid(),
  plan_id            uuid references public.plans (id) on delete set null,
  plan_day_id        uuid references public.plan_days (id) on delete set null,
  entry_date         date not null,
  -- Injury checkpoint
  knee_before        integer,
  knee_during        integer,
  knee_after         integer,
  knee_next_morning  integer,
  foot_status        text,
  calf_score         integer,
  gait_normal        boolean,
  stairs_normal      boolean,
  pain_quality       text,
  modification       text,
  traffic_light      public.traffic_light,
  -- Recovery tracking
  sleep_hours        numeric(4,1),
  sleep_quality      text,
  resting_hr         integer,
  hrv                integer,
  garmin_readiness   text,
  energy             text,
  stress             text,
  body_mass          numeric(5,1),
  soreness           integer,
  hydration_appetite text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists health_entries_entry_date_idx
  on public.health_entries (entry_date);

-- -----------------------------------------------------------------------------
-- strava_connections — OAuth tokens for the owner's Strava. PRIVATE: owner-only
-- everything. Tokens must never be publicly readable.
-- -----------------------------------------------------------------------------
create table if not exists public.strava_connections (
  id                uuid primary key default gen_random_uuid(),
  strava_athlete_id bigint unique,
  access_token      text,
  refresh_token     text,
  expires_at        timestamptz,
  scope             text,
  athlete_summary   jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- strava_activities — synced activities. Curated part of the public journey:
-- anon read, owner-only write. (Tokens live in strava_connections, not here.)
-- -----------------------------------------------------------------------------
create table if not exists public.strava_activities (
  id                   uuid primary key default gen_random_uuid(),
  plan_id              uuid references public.plans (id) on delete set null,
  plan_day_id          uuid references public.plan_days (id) on delete set null,
  strava_id            bigint not null unique,
  name                 text,
  sport_type           text,
  start_date           timestamptz,
  distance_m           numeric(10,1),
  moving_time_s        integer,
  elapsed_time_s       integer,
  average_speed        numeric(8,3),
  average_heartrate    numeric(5,1),
  max_heartrate        numeric(5,1),
  total_elevation_gain numeric(8,1),
  map_polyline         text,
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists strava_activities_start_date_idx
  on public.strava_activities (start_date);
create index if not exists strava_activities_plan_day_idx
  on public.strava_activities (plan_day_id);

-- -----------------------------------------------------------------------------
-- Helpful indexes on the read paths later units will use.
-- -----------------------------------------------------------------------------
create index if not exists plan_weeks_plan_idx       on public.plan_weeks (plan_id, week_index);
create index if not exists plan_days_plan_date_idx    on public.plan_days (plan_id, date);
create index if not exists plan_days_week_idx         on public.plan_days (week_id);
create index if not exists day_sessions_day_idx       on public.day_sessions (plan_day_id);
create index if not exists day_alternatives_day_idx   on public.day_alternatives (plan_day_id);
create index if not exists milestones_plan_idx        on public.milestones (plan_id, milestone_index);
create index if not exists checkpoints_plan_idx       on public.checkpoints (plan_id, checkpoint_index);
create index if not exists session_logs_plan_idx      on public.session_logs (plan_id);
