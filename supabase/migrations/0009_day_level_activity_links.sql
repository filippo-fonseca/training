-- =============================================================================
-- 0009_day_level_activity_links.sql
-- Day-level (off-plan) Strava evidence links.
--
-- Background: 0007 introduced session_activity_links as a join between a plan
-- SESSION (day_sessions row) and a synced Strava activity. But a Run recorded on
-- a day that planned no running session ("Nothing planned") still deserves to be
-- logged as verified evidence for the DAY. To support that (sealed decision D2),
-- a link now attaches to a plan_day directly, and may or may not also name a
-- session:
--   * day_session_id NOT NULL  -> the run completes that planned session (on-plan).
--   * day_session_id NULL      -> a day-level, OFF-PLAN link: verified logged
--                                 volume for the day that never marks a planned
--                                 (strength/rest) session done.
--
-- Changes to session_activity_links:
--   1. add plan_day_id (FK -> plan_days, cascade), backfilled from the linked
--      session's plan_day_id, then made NOT NULL. Every link now names its day.
--   2. day_session_id becomes NULLABLE (a NULL day_session_id = off-plan link).
--   3. add unique (plan_day_id, strava_activity_id): an activity attaches at most
--      once per day, whether on-plan or off-plan.
--   4. add an index on plan_day_id for the by-day evidence read.
--
-- RLS policies from 0007 (public SELECT, owner-only writes) are unchanged and keep
-- applying to the altered table.
--
-- Idempotent: `add column if not exists`, guarded backfill, `create unique index
-- if not exists`, `drop not null` (a no-op when already nullable). Matches the
-- style of 0001-0007. DO NOT apply this to the live database from a build lane;
-- the Conductor applies migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. plan_day_id: the plan day this evidence belongs to. Added nullable so the
--    backfill can populate it, then constrained NOT NULL below.
-- -----------------------------------------------------------------------------
alter table public.session_activity_links
  add column if not exists plan_day_id uuid references public.plan_days (id) on delete cascade;

-- Backfill from the linked session's day. Only touches rows that do not yet have
-- a plan_day_id (so re-running is a no-op and off-plan rows are left alone).
update public.session_activity_links l
   set plan_day_id = ds.plan_day_id
  from public.day_sessions ds
 where l.day_session_id = ds.id
   and l.plan_day_id is null;

-- Now every row has a plan_day_id: constrain it.
alter table public.session_activity_links
  alter column plan_day_id set not null;

-- -----------------------------------------------------------------------------
-- 2. day_session_id becomes nullable: a NULL means a day-level / off-plan link.
-- -----------------------------------------------------------------------------
alter table public.session_activity_links
  alter column day_session_id drop not null;

-- -----------------------------------------------------------------------------
-- 3. Unique (plan_day_id, strava_activity_id): an activity links to a given day
--    at most once, on-plan or off-plan. (The original (day_session_id,
--    strava_activity_id) unique from 0007 stays; with a NULL day_session_id its
--    NULLs are distinct, so this day-level unique is the one that de-dupes
--    off-plan links.) Expressed as a unique index so it is idempotent.
-- -----------------------------------------------------------------------------
create unique index if not exists session_activity_links_day_activity_uk
  on public.session_activity_links (plan_day_id, strava_activity_id);

-- -----------------------------------------------------------------------------
-- 4. Index the by-day evidence read (used to group evidence per plan day).
-- -----------------------------------------------------------------------------
create index if not exists session_activity_links_plan_day_idx
  on public.session_activity_links (plan_day_id);
