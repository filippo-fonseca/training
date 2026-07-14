-- =============================================================================
-- 0006_health_day_unique_full.sql
-- Replace the partial unique index on health_entries(plan_day_id) with a full
-- unique constraint.
--
-- Loop 2 defect DEF-H1: upsertHealthEntry uses ON CONFLICT (plan_day_id), but
-- Postgres cannot use a PARTIAL unique index as an ON CONFLICT arbiter unless
-- the INSERT repeats the index predicate, which PostgREST never emits. Every
-- health save therefore failed with "no unique or exclusion constraint
-- matching the ON CONFLICT specification".
--
-- A full unique constraint has the same semantics the partial index was after:
-- plan_day_id stays nullable and Postgres treats NULLs as distinct, so any
-- number of off-plan entries (plan_day_id is null) are still allowed while
-- non-null days stay unique. Unlike the partial index, it is a valid ON
-- CONFLICT arbiter.
--
-- Idempotent: guarded drop of the old index, guarded add of the constraint.
-- =============================================================================

drop index if exists public.health_entries_plan_day_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'health_entries_plan_day_id_key'
      and conrelid = 'public.health_entries'::regclass
  ) then
    alter table public.health_entries
      add constraint health_entries_plan_day_id_key unique (plan_day_id);
  end if;
end $$;
