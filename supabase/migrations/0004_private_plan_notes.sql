-- =============================================================================
-- 0004_private_plan_notes.sql
-- Move the clinical/private plan narrative off the public `plans` table.
--
-- Sealed decision D1: injury/health details are owner-only, never publicly
-- readable. `plans` is a CURATED table (anon SELECT), so `medical_notes` and
-- `athlete_notes` (which carry injury/clinical narrative) were leaking under
-- RLS. This migration relocates them into a new PRIVATE table,
-- `plan_private_notes`, owner-only for EVERY operation (including SELECT), with
-- no anon policy at all, then drops the two columns from `plans`.
--
-- Idempotent: `create table if not exists`, guarded trigger, data-migration
-- insert with `on conflict do nothing`, and `drop column if exists`. Safe to
-- re-run; matches the style of 0001-0003.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- plan_private_notes — PRIVATE 1:1 sidecar of plans holding the clinical/injury
-- narrative. Owner-only for every operation, including SELECT. Never publicly
-- readable. plan_id is the primary key so there is exactly one row per plan and
-- the data-migration upsert is naturally idempotent.
-- -----------------------------------------------------------------------------
create table if not exists public.plan_private_notes (
  plan_id       uuid primary key references public.plans (id) on delete cascade,
  medical_notes text,
  athlete_notes text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at trigger (0002's trigger loop predates this table, so attach here).
-- Guarded drop-then-create keeps the migration re-runnable.
drop trigger if exists set_updated_at on public.plan_private_notes;
create trigger set_updated_at before update on public.plan_private_notes
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: enable + force, then owner-only for ALL operations via is_owner().
-- No public/anon policy exists, so anon SELECT is denied by default. Idempotent
-- (drop-if-exists then create), matching 0003's shape for private tables.
-- -----------------------------------------------------------------------------
alter table public.plan_private_notes enable row level security;
alter table public.plan_private_notes force row level security;

drop policy if exists plan_private_notes_select_owner on public.plan_private_notes;
drop policy if exists plan_private_notes_insert_owner on public.plan_private_notes;
drop policy if exists plan_private_notes_update_owner on public.plan_private_notes;
drop policy if exists plan_private_notes_delete_owner on public.plan_private_notes;

create policy plan_private_notes_select_owner on public.plan_private_notes
  for select using (public.is_owner());
create policy plan_private_notes_insert_owner on public.plan_private_notes
  for insert with check (public.is_owner());
create policy plan_private_notes_update_owner on public.plan_private_notes
  for update using (public.is_owner()) with check (public.is_owner());
create policy plan_private_notes_delete_owner on public.plan_private_notes
  for delete using (public.is_owner());

-- -----------------------------------------------------------------------------
-- Migrate any existing data off the public columns. Only plans that actually
-- carry notes produce a row. Guarded by an existence check on the source
-- columns so this migration is safe to re-run after the columns are dropped
-- (on a second run the columns are gone, so the migration is skipped).
-- `on conflict do nothing` keeps it idempotent within a single schema state.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plans'
      and column_name = 'medical_notes'
  ) then
    insert into public.plan_private_notes (plan_id, medical_notes, athlete_notes)
    select p.id, p.medical_notes, p.athlete_notes
    from public.plans p
    where p.medical_notes is not null
       or p.athlete_notes is not null
    on conflict (plan_id) do nothing;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Drop the leaking columns from the public plans table. Idempotent.
-- -----------------------------------------------------------------------------
alter table public.plans drop column if exists medical_notes;
alter table public.plans drop column if exists athlete_notes;
