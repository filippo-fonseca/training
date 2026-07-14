-- =============================================================================
-- 0008_phase_date_ranges.sql
-- Phases become pure date-ranged groupings.
--
-- A phase used to own its weeks two ways at once: a manual plan_weeks.phase_id
-- foreign key, and an integer [start_week, end_week] range on plan_phases. This
-- migration makes date containment the single source of truth, exactly like a
-- day already matches into its week by date. A week belongs to the phase whose
-- [start_date, end_date] window contains the week's start_date (the membership
-- rule lives in lib/derive/phase-membership.ts, shared by every consumer).
--
-- Three changes:
--   1. plan_phases gains start_date / end_date (date, nullable).
--   2. Each phase is backfilled from its current member weeks: start_date =
--      min(plan_weeks.start_date), end_date = max(plan_weeks.end_date) over the
--      weeks that still point at it via the existing plan_weeks.phase_id. This
--      runs BEFORE the column is dropped, while the link still exists.
--   3. plan_weeks.phase_id is dropped (its foreign-key constraint goes with the
--      column). start_week / end_week stay on plan_phases as inert legacy
--      columns; nothing reads them once the app is on the date helper.
--
-- Nullability: start_date / end_date are intentionally left NULLABLE. A phase
-- with no member weeks (or one authored before its dates are set) stays
-- null-dated and simply matches nothing, rather than blocking the migration or
-- forcing a bogus range. The helper treats a null-dated phase as containing no
-- dates, so such a phase quietly owns no weeks until an owner sets its window.
--
-- Idempotent: `add column if not exists`, a backfill that only fills nulls, and
-- a guarded `drop column if exists`. Matches the style of 0001-0007. DO NOT
-- apply this to the live database from a build lane; the Conductor applies
-- migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. New date-range columns on plan_phases (nullable; see header).
-- -----------------------------------------------------------------------------
alter table public.plan_phases
  add column if not exists start_date date,
  add column if not exists end_date   date;

-- -----------------------------------------------------------------------------
-- 2. Backfill each phase's window from its current member weeks, via the
--    plan_weeks.phase_id link that still exists at this point. Only fills rows
--    whose dates are still null, so re-running never clobbers curated dates.
--    Guarded on the column existing so a re-run after step 3 is a no-op.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plan_weeks'
      and column_name = 'phase_id'
  ) then
    update public.plan_phases p
       set start_date = coalesce(p.start_date, agg.min_start),
           end_date   = coalesce(p.end_date,   agg.max_end)
      from (
        select phase_id,
               min(start_date) as min_start,
               max(end_date)   as max_end
          from public.plan_weeks
         where phase_id is not null
         group by phase_id
      ) agg
     where p.id = agg.phase_id
       and (p.start_date is null or p.end_date is null);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Drop the manual week-to-phase link. Dropping the column also drops its
--    dependent foreign-key constraint (plan_weeks_phase_id_fkey); there is no
--    separate index on phase_id to remove.
-- -----------------------------------------------------------------------------
alter table public.plan_weeks
  drop column if exists phase_id;
