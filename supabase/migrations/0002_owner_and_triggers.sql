-- =============================================================================
-- 0002_owner_and_triggers.sql
-- Ownership helper, updated_at triggers, and admin_email bootstrap.
--
-- The app is single-owner. There is no per-row user_id: authorization is simply
-- "are you THE owner?". is_owner() answers that by comparing the caller's JWT
-- email against app_settings.admin_email. It is SECURITY DEFINER so it can read
-- app_settings even though that table is owner-only under RLS (otherwise the
-- check would be circular). The app runtime never needs the service role key;
-- writes go through a normal authenticated session whose email must match.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_owner() — true when the caller's JWT email equals the configured admin.
-- STABLE (depends only on the current statement's jwt + settings row).
-- -----------------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_settings s
    where s.key = 'admin_email'
      and s.value is not null
      and lower(s.value) = lower(nullif(auth.jwt() ->> 'email', ''))
  );
$$;

comment on function public.is_owner() is
  'True when the authenticated caller''s JWT email matches app_settings.admin_email. Used by every owner-only RLS policy.';

-- Lock the function down: only these roles may execute it.
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- touch_updated_at() — generic trigger to maintain updated_at on write.
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach the trigger to every table that has an updated_at column. Guarded so
-- the migration is idempotent (drop-then-create).
do $$
declare
  t text;
  tables text[] := array[
    'app_settings', 'plans', 'plan_phases', 'plan_weeks', 'plan_days',
    'day_sessions', 'milestones', 'checkpoints', 'session_logs',
    'health_entries', 'strava_connections', 'strava_activities'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Bootstrap the owner. This value is the ONLY thing that grants write access,
-- so it is seeded here (not in seed.sql, which is regenerated from the plan doc).
-- Conductor-confirmed owner email: filifonsecacagnazzo@gmail.com.
-- Idempotent upsert.
-- -----------------------------------------------------------------------------
insert into public.app_settings (key, value)
values ('admin_email', 'filifonsecacagnazzo@gmail.com')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.app_settings (key, value)
values ('timezone', 'America/New_York')
on conflict (key) do update set value = excluded.value, updated_at = now();
