-- =============================================================================
-- 0007_strava_session_links.sql
-- Strava activities as session evidence.
--
-- The owner selects one or more synced Strava activities and links them to a
-- plan session (day_sessions row). Semantics the app layer derives from these
-- links:
--   * A session with >= 1 linked activity is DONE.
--   * The session's ACTUAL distance / time is the CUMULATIVE total across its
--     linked activities (never manually entered).
--   * Publicly, a linked session shows verification: the activity photo, its
--     title, and an outbound link to strava.com/activities/<strava_id>.
--
-- Two changes:
--   1. session_activity_links — a many-to-many join between day_sessions and
--      strava_activities (a track day yields several activities per session, and
--      an activity is only ever linked once per session). CURATED per D1: public
--      SELECT so the public day page can render evidence; owner-only writes.
--   2. strava_activities.photo_url — the primary activity photo for the public
--      verification badge. distance_m, moving_time_s, elapsed_time_s, name, and
--      strava_id already exist; photo_url is the one evidence field missing.
--
-- Idempotent: `create table/column if not exists`, guarded RLS policies
-- (drop-if-exists then create). Matches the style of 0001-0006. DO NOT apply
-- this to the live database from a build lane; the Conductor applies migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- strava_activities.photo_url — primary photo URL for the public evidence badge.
-- Curated, public-safe (the table is already anon-readable); no token or private
-- payload lives here. Populated by the sync/link path (see lib/strava/sync.ts).
-- -----------------------------------------------------------------------------
alter table public.strava_activities
  add column if not exists photo_url text;

-- -----------------------------------------------------------------------------
-- session_activity_links — link a plan session to a synced Strava activity.
-- unique (day_session_id, strava_activity_id) so a given activity links to a
-- session at most once; both sides cascade-delete so removing a session or an
-- activity cleans up its links.
-- -----------------------------------------------------------------------------
create table if not exists public.session_activity_links (
  id                 uuid primary key default gen_random_uuid(),
  day_session_id     uuid not null references public.day_sessions (id) on delete cascade,
  strava_activity_id uuid not null references public.strava_activities (id) on delete cascade,
  created_at         timestamptz not null default now(),
  unique (day_session_id, strava_activity_id)
);

create index if not exists session_activity_links_session_idx
  on public.session_activity_links (day_session_id);
create index if not exists session_activity_links_activity_idx
  on public.session_activity_links (strava_activity_id);

-- -----------------------------------------------------------------------------
-- RLS: CURATED shape (public SELECT, owner-only writes), matching 0003. Enable +
-- force, then the four policies via public.is_owner(). Idempotent (drop-if-exists
-- then create).
-- -----------------------------------------------------------------------------
alter table public.session_activity_links enable row level security;
alter table public.session_activity_links force row level security;

drop policy if exists session_activity_links_select_public on public.session_activity_links;
drop policy if exists session_activity_links_insert_owner on public.session_activity_links;
drop policy if exists session_activity_links_update_owner on public.session_activity_links;
drop policy if exists session_activity_links_delete_owner on public.session_activity_links;

create policy session_activity_links_select_public on public.session_activity_links
  for select using (true);
create policy session_activity_links_insert_owner on public.session_activity_links
  for insert with check (public.is_owner());
create policy session_activity_links_update_owner on public.session_activity_links
  for update using (public.is_owner()) with check (public.is_owner());
create policy session_activity_links_delete_owner on public.session_activity_links
  for delete using (public.is_owner());
