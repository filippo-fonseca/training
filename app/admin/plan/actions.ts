'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { str, reqStr, num, int, bool, fail, OK, dbMessage, type ActionResult } from '@/app/admin/_lib/form';
import { upsertPlanPrivateNotes } from '@/lib/db';
import type { TypedSupabaseClient } from '@/lib/db';

// Every mutation refreshes the admin subtree and the public surfaces (which read
// the same tables through RLS). revalidatePath on a not-yet-built public route is
// a harmless no-op.
function revalidateAll(planId?: string) {
  revalidatePath('/admin', 'layout');
  if (planId) revalidatePath(`/admin/plan/${planId}`, 'layout');
  revalidatePath('/', 'layout');
}

async function ownerClient(): Promise<TypedSupabaseClient> {
  await requireOwner();
  return createServerSupabaseClient();
}

// -----------------------------------------------------------------------------
// Plans
// -----------------------------------------------------------------------------
export async function createPlan(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const slug = reqStr(fd, 'slug');
  const title = reqStr(fd, 'title');
  if (!slug) return fail('A slug is required.');
  if (!title) return fail('A title is required.');
  if (!/^[a-z0-9-]+$/.test(slug)) return fail('Slug must be lowercase letters, numbers, and hyphens.');

  const { data, error } = await supabase
    .from('plans')
    .insert({ slug, title })
    .select('id')
    .single();
  if (error) return fail(dbMessage('Create plan', error.message));
  revalidateAll(data.id);
  redirect(`/admin/plan/${data.id}`);
}

export async function updatePlan(planId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const title = reqStr(fd, 'title');
  if (!title) return fail('A title is required.');

  const { error } = await supabase
    .from('plans')
    .update({
      title,
      slug: reqStr(fd, 'slug') || undefined,
      version: int(fd, 'version') ?? 1,
      status: reqStr(fd, 'status') || 'active',
      prepared_on: str(fd, 'prepared_on'),
      athlete_name: str(fd, 'athlete_name'),
      athlete_age: int(fd, 'athlete_age'),
      race_name: str(fd, 'race_name'),
      race_distance_km: num(fd, 'race_distance_km'),
      race_date: str(fd, 'race_date'),
      race_start_time: str(fd, 'race_start_time'),
      race_location: str(fd, 'race_location'),
      race_course_notes: str(fd, 'race_course_notes'),
      start_date: str(fd, 'start_date'),
      end_date: str(fd, 'end_date'),
      total_planned_km: num(fd, 'total_planned_km'),
      north_star: str(fd, 'north_star'),
      plan_logic: str(fd, 'plan_logic'),
      goal_a: str(fd, 'goal_a'),
      goal_b: str(fd, 'goal_b'),
      goal_c: str(fd, 'goal_c'),
    })
    .eq('id', planId);
  if (error) return fail(dbMessage('Update plan', error.message));

  // Clinical/injury narrative is owner-only and lives in plan_private_notes,
  // never on the public plans row (decision D1). Upsert it separately.
  try {
    await upsertPlanPrivateNotes(supabase, {
      plan_id: planId,
      athlete_notes: str(fd, 'athlete_notes'),
      medical_notes: str(fd, 'medical_notes'),
    });
  } catch (e) {
    return fail(dbMessage('Update private notes', e instanceof Error ? e.message : 'unknown error'));
  }

  revalidateAll(planId);
  return OK;
}

export async function deletePlan(planId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('plans').delete().eq('id', planId);
  if (error) throw new Error(dbMessage('Delete plan', error.message));
  revalidateAll();
  redirect('/admin/plan');
}

// -----------------------------------------------------------------------------
// Phases
// -----------------------------------------------------------------------------
export async function upsertPhase(planId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const id = str(fd, 'id');
  const name = reqStr(fd, 'name');
  const phaseIndex = int(fd, 'phase_index');
  if (!name) return fail('A phase name is required.');
  if (phaseIndex === null) return fail('A phase order index is required.');

  const payload = {
    plan_id: planId,
    phase_index: phaseIndex,
    name,
    start_week: int(fd, 'start_week'),
    end_week: int(fd, 'end_week'),
    description: str(fd, 'description'),
  };
  const { error } = id
    ? await supabase.from('plan_phases').update(payload).eq('id', id)
    : await supabase.from('plan_phases').insert(payload);
  if (error) return fail(dbMessage('Save phase', error.message));
  revalidateAll(planId);
  return OK;
}

export async function deletePhase(planId: string, phaseId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('plan_phases').delete().eq('id', phaseId);
  if (error) throw new Error(dbMessage('Delete phase', error.message));
  revalidateAll(planId);
}

// -----------------------------------------------------------------------------
// Weeks
// -----------------------------------------------------------------------------
export async function upsertWeek(planId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const id = str(fd, 'id');
  const weekIndex = int(fd, 'week_index');
  if (weekIndex === null) return fail('A week index is required.');

  const payload = {
    plan_id: planId,
    week_index: weekIndex,
    phase_id: str(fd, 'phase_id'),
    start_date: str(fd, 'start_date'),
    end_date: str(fd, 'end_date'),
    phase_label: str(fd, 'phase_label'),
    planned_km: num(fd, 'planned_km'),
    range_min_km: num(fd, 'range_min_km'),
    range_max_km: num(fd, 'range_max_km'),
    run_days: int(fd, 'run_days'),
    long_run_km: num(fd, 'long_run_km'),
    previous_text: str(fd, 'previous_text'),
    pct_change_text: str(fd, 'pct_change_text'),
    coaching_note: str(fd, 'coaching_note'),
    performance_target: str(fd, 'performance_target'),
    injury_target: str(fd, 'injury_target'),
    bike_note: str(fd, 'bike_note'),
    strength_note: str(fd, 'strength_note'),
    is_cutback: bool(fd, 'is_cutback'),
    is_taper: bool(fd, 'is_taper'),
    is_race_week: bool(fd, 'is_race_week'),
    is_peak: bool(fd, 'is_peak'),
  };
  const { error } = id
    ? await supabase.from('plan_weeks').update(payload).eq('id', id)
    : await supabase.from('plan_weeks').insert(payload);
  if (error) return fail(dbMessage('Save week', error.message));
  revalidateAll(planId);
  return OK;
}

export async function deleteWeek(planId: string, weekId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('plan_weeks').delete().eq('id', weekId);
  if (error) throw new Error(dbMessage('Delete week', error.message));
  revalidateAll(planId);
}

// -----------------------------------------------------------------------------
// Days
// -----------------------------------------------------------------------------
export async function createDay(planId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const weekId = str(fd, 'week_id');
  const date = str(fd, 'date');
  const dayIndex = int(fd, 'day_index');
  if (!weekId) return fail('Choose the week this day belongs to.');
  if (!date) return fail('A date is required.');
  if (dayIndex === null) return fail('A day index (1..N) is required.');

  const { data, error } = await supabase
    .from('plan_days')
    .insert({
      plan_id: planId,
      week_id: weekId,
      date,
      day_index: dayIndex,
      weekday: str(fd, 'weekday'),
      days_to_race: int(fd, 'days_to_race'),
      week_number: int(fd, 'week_number'),
      phase_label: str(fd, 'phase_label'),
      planned_run_km: num(fd, 'planned_run_km') ?? 0,
      cumulative_km: num(fd, 'cumulative_km'),
    })
    .select('id')
    .single();
  if (error) return fail(dbMessage('Create day', error.message));
  revalidateAll(planId);
  redirect(`/admin/plan/${planId}/days/${data.id}`);
}

export async function updateDay(planId: string, dayId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const date = str(fd, 'date');
  const dayIndex = int(fd, 'day_index');
  if (!date) return fail('A date is required.');
  if (dayIndex === null) return fail('A day index is required.');

  const { error } = await supabase
    .from('plan_days')
    .update({
      date,
      day_index: dayIndex,
      week_id: str(fd, 'week_id') ?? undefined,
      weekday: str(fd, 'weekday'),
      days_to_race: int(fd, 'days_to_race'),
      week_number: int(fd, 'week_number'),
      phase_label: str(fd, 'phase_label'),
      planned_run_km: num(fd, 'planned_run_km') ?? 0,
      cumulative_km: num(fd, 'cumulative_km'),
    })
    .eq('id', dayId);
  if (error) return fail(dbMessage('Update day', error.message));
  revalidateAll(planId);
  return OK;
}

export async function deleteDay(planId: string, dayId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('plan_days').delete().eq('id', dayId);
  if (error) throw new Error(dbMessage('Delete day', error.message));
  revalidateAll(planId);
  redirect(`/admin/plan/${planId}/days`);
}

// -----------------------------------------------------------------------------
// Day sessions (primary + secondary slots)
// -----------------------------------------------------------------------------
const SLOTS = ['primary', 'secondary'] as const;
const CATEGORIES = ['easy_run', 'long_run', 'quality_run', 'bike', 'strength_only', 'rest', 'race'] as const;

export async function upsertSession(
  planId: string,
  dayId: string,
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const supabase = await ownerClient();
  const id = str(fd, 'id');
  const slotRaw = str(fd, 'slot');
  const title = reqStr(fd, 'title');
  if (!slotRaw || !SLOTS.includes(slotRaw as (typeof SLOTS)[number])) return fail('Choose a slot.');
  if (!title) return fail('A session title is required.');
  const categoryRaw = str(fd, 'category');
  const category =
    categoryRaw && CATEGORIES.includes(categoryRaw as (typeof CATEGORIES)[number]) ? categoryRaw : null;

  const payload = {
    plan_day_id: dayId,
    slot: slotRaw as (typeof SLOTS)[number],
    title,
    category: category as (typeof CATEGORIES)[number] | null,
    is_quality: bool(fd, 'is_quality'),
    role: str(fd, 'role'),
    prescription_text: str(fd, 'prescription_text'),
    distance_km: num(fd, 'distance_km'),
    duration_text: str(fd, 'duration_text'),
    duration_min_minutes: int(fd, 'duration_min_minutes'),
    duration_max_minutes: int(fd, 'duration_max_minutes'),
    pace_text: str(fd, 'pace_text'),
    pace_min_s_per_km: int(fd, 'pace_min_s_per_km'),
    pace_max_s_per_km: int(fd, 'pace_max_s_per_km'),
    rpe_text: str(fd, 'rpe_text'),
    hr_text: str(fd, 'hr_text'),
    terrain: str(fd, 'terrain'),
    cue: str(fd, 'cue'),
    fuel: str(fd, 'fuel'),
    shoes: str(fd, 'shoes'),
    completion_planned: str(fd, 'completion_planned'),
  };
  const { error } = id
    ? await supabase.from('day_sessions').update(payload).eq('id', id)
    : await supabase.from('day_sessions').insert(payload);
  if (error) return fail(dbMessage('Save session', error.message));
  revalidateAll(planId);
  return OK;
}

export async function deleteSession(planId: string, sessionId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('day_sessions').delete().eq('id', sessionId);
  if (error) throw new Error(dbMessage('Delete session', error.message));
  revalidateAll(planId);
}

// -----------------------------------------------------------------------------
// Day alternatives (green / yellow / red)
// -----------------------------------------------------------------------------
const GATES = ['green', 'yellow', 'red'] as const;

export async function upsertAlternative(
  planId: string,
  dayId: string,
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const supabase = await ownerClient();
  const id = str(fd, 'id');
  const gateRaw = str(fd, 'gate');
  const prescription = reqStr(fd, 'prescription');
  if (!gateRaw || !GATES.includes(gateRaw as (typeof GATES)[number])) return fail('Choose a gate.');
  if (!prescription) return fail('A prescription is required.');

  const payload = {
    plan_day_id: dayId,
    gate: gateRaw as (typeof GATES)[number],
    prescription,
    distance_km: num(fd, 'distance_km'),
  };
  const { error } = id
    ? await supabase.from('day_alternatives').update(payload).eq('id', id)
    : await supabase.from('day_alternatives').insert(payload);
  if (error) return fail(dbMessage('Save alternative', error.message));
  revalidateAll(planId);
  return OK;
}

export async function deleteAlternative(planId: string, altId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('day_alternatives').delete().eq('id', altId);
  if (error) throw new Error(dbMessage('Delete alternative', error.message));
  revalidateAll(planId);
}

// -----------------------------------------------------------------------------
// Milestones
// -----------------------------------------------------------------------------
const MILESTONE_TYPES = [
  'decision_checkpoint', 'gated_long_run', 'key_workout',
  'taper_start', 'race', 'cutback_week', 'post_race',
] as const;

export async function upsertMilestone(planId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const id = str(fd, 'id');
  const title = reqStr(fd, 'title');
  const milestoneIndex = int(fd, 'milestone_index');
  const typeRaw = str(fd, 'type');
  if (!title) return fail('A milestone title is required.');
  if (milestoneIndex === null) return fail('A milestone order index is required.');
  if (!typeRaw || !MILESTONE_TYPES.includes(typeRaw as (typeof MILESTONE_TYPES)[number])) {
    return fail('Choose a milestone type.');
  }

  const payload = {
    plan_id: planId,
    milestone_index: milestoneIndex,
    type: typeRaw as (typeof MILESTONE_TYPES)[number],
    title,
    date: str(fd, 'date'),
    week_number: int(fd, 'week_number'),
    description: str(fd, 'description'),
    green_criteria: str(fd, 'green_criteria'),
    yellow_criteria: str(fd, 'yellow_criteria'),
    red_criteria: str(fd, 'red_criteria'),
  };
  const { error } = id
    ? await supabase.from('milestones').update(payload).eq('id', id)
    : await supabase.from('milestones').insert(payload);
  if (error) return fail(dbMessage('Save milestone', error.message));
  revalidateAll(planId);
  return OK;
}

export async function deleteMilestone(planId: string, milestoneId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
  if (error) throw new Error(dbMessage('Delete milestone', error.message));
  revalidateAll(planId);
}

// -----------------------------------------------------------------------------
// Checkpoints (traffic-light governance)
// -----------------------------------------------------------------------------
export async function upsertCheckpoint(planId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await ownerClient();
  const id = str(fd, 'id');
  const title = reqStr(fd, 'title');
  const checkpointIndex = int(fd, 'checkpoint_index');
  if (!title) return fail('A checkpoint title is required.');
  if (checkpointIndex === null) return fail('A checkpoint order index is required.');

  const payload = {
    plan_id: planId,
    checkpoint_index: checkpointIndex,
    title,
    after_week: int(fd, 'after_week'),
    green_action: str(fd, 'green_action'),
    yellow_action: str(fd, 'yellow_action'),
    red_action: str(fd, 'red_action'),
  };
  const { error } = id
    ? await supabase.from('checkpoints').update(payload).eq('id', id)
    : await supabase.from('checkpoints').insert(payload);
  if (error) return fail(dbMessage('Save checkpoint', error.message));
  revalidateAll(planId);
  return OK;
}

export async function deleteCheckpoint(planId: string, checkpointId: string): Promise<void> {
  const supabase = await ownerClient();
  const { error } = await supabase.from('checkpoints').delete().eq('id', checkpointId);
  if (error) throw new Error(dbMessage('Delete checkpoint', error.message));
  revalidateAll(planId);
}
