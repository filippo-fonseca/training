-- =============================================================================
-- 0003_rls.sql
-- Row-level security for every table (sealed decision D1).
--
-- Two shapes:
--   CURATED (the public journey): anyone may SELECT; only the owner may write.
--     plans, plan_phases, plan_weeks, plan_days, day_sessions, day_alternatives,
--     milestones, checkpoints, session_logs, strava_activities.
--   PRIVATE (owner-only, including SELECT):
--     health_entries, strava_connections, app_settings.
--
-- Writes are owner-only EVERYWHERE via public.is_owner(). RLS is enabled on
-- every table; a table with RLS on and no matching policy denies by default,
-- so the private tables are safe even before their explicit policies below.
--
-- Idempotent: each policy is dropped if present, then created.
-- =============================================================================

do $$
declare
  t text;
  curated text[] := array[
    'plans', 'plan_phases', 'plan_weeks', 'plan_days', 'day_sessions',
    'day_alternatives', 'milestones', 'checkpoints', 'session_logs',
    'strava_activities'
  ];
  private_tables text[] := array[
    'health_entries', 'strava_connections', 'app_settings'
  ];
  all_tables text[];
begin
  all_tables := curated || private_tables;

  -- Enable + force RLS on every table.
  foreach t in array all_tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;

  -- CURATED tables: public SELECT, owner-only writes.
  foreach t in array curated loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_public', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_owner', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_owner', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_owner', t);

    execute format(
      'create policy %I on public.%I for select using (true);',
      t || '_select_public', t);
    execute format(
      'create policy %I on public.%I for insert with check (public.is_owner());',
      t || '_insert_owner', t);
    execute format(
      'create policy %I on public.%I for update using (public.is_owner()) with check (public.is_owner());',
      t || '_update_owner', t);
    execute format(
      'create policy %I on public.%I for delete using (public.is_owner());',
      t || '_delete_owner', t);
  end loop;

  -- PRIVATE tables: owner-only for every operation, including SELECT.
  foreach t in array private_tables loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_owner', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_owner', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_owner', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_owner', t);

    execute format(
      'create policy %I on public.%I for select using (public.is_owner());',
      t || '_select_owner', t);
    execute format(
      'create policy %I on public.%I for insert with check (public.is_owner());',
      t || '_insert_owner', t);
    execute format(
      'create policy %I on public.%I for update using (public.is_owner()) with check (public.is_owner());',
      t || '_update_owner', t);
    execute format(
      'create policy %I on public.%I for delete using (public.is_owner());',
      t || '_delete_owner', t);
  end loop;
end $$;
