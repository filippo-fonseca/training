-- =============================================================================
-- 0005_log_hr_and_health_unique.sql
-- Two small additive fixes surfaced while wiring the session-logging and
-- health-tracking admin forms:
--
--  1. session_logs was missing an actual average heart-rate field (the daily
--     form's "avg HR" fill-in target), alongside the existing actual_rpe.
--  2. health_entries had no unique constraint on plan_day_id, so upsert-by-day
--     (the same "one entry per day, editable after save" pattern session_logs
--     already gets from its plan_day_id unique constraint) would silently
--     insert a new row on every save instead of updating the existing one.
--     plan_day_id is nullable (off-plan entries are allowed), so the
--     constraint is a partial unique index over non-null values only.
--
-- Idempotent: guarded column add, `if not exists` index. Safe to re-run.
-- =============================================================================

alter table public.session_logs
  add column if not exists actual_avg_hr integer;

create unique index if not exists health_entries_plan_day_id_key
  on public.health_entries (plan_day_id)
  where plan_day_id is not null;
