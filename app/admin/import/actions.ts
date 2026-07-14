'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { getPlanCounts, type PlanCounts } from '@/app/admin/_lib/queries';
import { dbMessage } from '@/app/admin/_lib/form';
import { validateImport, type ImportCounts } from '@/app/admin/import/_lib/schema';

export interface PreviewResult {
  ok: boolean;
  errors: string[];
  /** Non-blocking notices (e.g. ignored legacy per-week phase references). */
  warnings: string[];
  slug?: string;
  title?: string;
  counts?: ImportCounts;
  mode?: 'create' | 'replace';
  /** Existing parent-row counts when the slug already exists (replace mode). */
  existing?: PlanCounts | null;
}

export interface ApplyResult {
  ok: boolean;
  errors: string[];
  planId?: string;
  mode?: 'create' | 'replace';
  counts?: ImportCounts;
}

/** Validate + report what applying would do (create vs replace), without writing. */
export async function previewImport(raw: string): Promise<PreviewResult> {
  await requireOwner();
  const result = validateImport(raw);
  if (!result.ok || !result.value) {
    return { ok: false, errors: result.errors, warnings: result.warnings };
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error } = await supabase
    .from('plans')
    .select('id')
    .eq('slug', result.slug as string)
    .maybeSingle();
  if (error) {
    return { ok: false, errors: [dbMessage('Preview', error.message)], warnings: result.warnings };
  }

  return {
    ok: true,
    errors: [],
    warnings: result.warnings,
    slug: result.slug,
    title: result.title,
    counts: result.counts,
    mode: existing ? 'replace' : 'create',
    existing: existing ? await getPlanCounts(existing.id) : null,
  };
}

/** Validate + apply. Replaces any plan with the same slug (delete cascade, then
 *  insert). Best-effort atomic: on any failure after the plan row is created the
 *  new plan is deleted so a partial import is never left behind. */
export async function applyImport(raw: string): Promise<ApplyResult> {
  await requireOwner();
  const result = validateImport(raw);
  if (!result.ok || !result.value) {
    return { ok: false, errors: result.errors };
  }
  const doc = result.value;
  const supabase = await createServerSupabaseClient();

  const { data: existing, error: findErr } = await supabase
    .from('plans')
    .select('id')
    .eq('slug', doc.plan.slug)
    .maybeSingle();
  if (findErr) return { ok: false, errors: [dbMessage('Find existing plan', findErr.message)] };

  if (existing) {
    const { error } = await supabase.from('plans').delete().eq('id', existing.id);
    if (error) return { ok: false, errors: [dbMessage('Replace: delete existing plan', error.message)] };
  }

  // The injury/clinical narrative is owner-only and never lives on the public
  // plans row (decision D1). Split it off before inserting the plan, then write
  // it to plan_private_notes below.
  const { medical_notes, athlete_notes, ...planColumns } = doc.plan;

  const { data: planRow, error: planErr } = await supabase
    .from('plans')
    .insert(planColumns)
    .select('id')
    .single();
  if (planErr || !planRow) {
    return { ok: false, errors: [dbMessage('Insert plan', planErr?.message ?? 'no row returned')] };
  }
  const planId = planRow.id;

  try {
    // Private notes: only write a row when there is actually something to store.
    if (medical_notes !== null || athlete_notes !== null) {
      const { error } = await supabase
        .from('plan_private_notes')
        .insert({ plan_id: planId, medical_notes, athlete_notes });
      if (error) throw new Error(dbMessage('Insert private notes', error.message));
    }

    // Phases carry their own date window (start_date/end_date); weeks match into
    // them by date containment at read time, so there is no phase_id to resolve.
    if (doc.phases.length > 0) {
      const { error } = await supabase
        .from('plan_phases')
        .insert(doc.phases.map((p) => ({ plan_id: planId, ...p })));
      if (error) throw new Error(dbMessage('Insert phases', error.message));
    }

    // Weeks -> id map by week_index
    const weekIdByIndex = new Map<number, string>();
    if (doc.weeks.length > 0) {
      // phase_index on a week is ignored: phase membership is derived from
      // dates now (migration 0008), never from a stored per-week link.
      const rows = doc.weeks.map(({ phase_index: _ignored, ...rest }) => ({
        plan_id: planId,
        ...rest,
      }));
      const { data, error } = await supabase.from('plan_weeks').insert(rows).select('id, week_index');
      if (error) throw new Error(dbMessage('Insert weeks', error.message));
      for (const r of data ?? []) weekIdByIndex.set(r.week_index, r.id);
    }

    // Days -> id map by day_index (resolve week_id)
    const dayIdByIndex = new Map<number, string>();
    if (doc.days.length > 0) {
      const rows = doc.days.map(({ week_index, sessions, alternatives, ...rest }) => ({
        plan_id: planId,
        week_id: weekIdByIndex.get(week_index) as string,
        ...rest,
      }));
      const { data, error } = await supabase.from('plan_days').insert(rows).select('id, day_index');
      if (error) throw new Error(dbMessage('Insert days', error.message));
      for (const r of data ?? []) dayIdByIndex.set(r.day_index, r.id);
    }

    // Sessions + alternatives across all days
    const sessionRows = doc.days.flatMap((d) =>
      d.sessions.map((s) => ({ plan_day_id: dayIdByIndex.get(d.day_index) as string, ...s })),
    );
    const altRows = doc.days.flatMap((d) =>
      d.alternatives.map((a) => ({ plan_day_id: dayIdByIndex.get(d.day_index) as string, ...a })),
    );
    if (sessionRows.length > 0) {
      const { error } = await supabase.from('day_sessions').insert(sessionRows);
      if (error) throw new Error(dbMessage('Insert sessions', error.message));
    }
    if (altRows.length > 0) {
      const { error } = await supabase.from('day_alternatives').insert(altRows);
      if (error) throw new Error(dbMessage('Insert alternatives', error.message));
    }

    if (doc.milestones.length > 0) {
      const { error } = await supabase
        .from('milestones')
        .insert(doc.milestones.map((m) => ({ plan_id: planId, ...m })));
      if (error) throw new Error(dbMessage('Insert milestones', error.message));
    }
    if (doc.checkpoints.length > 0) {
      const { error } = await supabase
        .from('checkpoints')
        .insert(doc.checkpoints.map((cp) => ({ plan_id: planId, ...cp })));
      if (error) throw new Error(dbMessage('Insert checkpoints', error.message));
    }
  } catch (e) {
    // Roll back the partial import.
    await supabase.from('plans').delete().eq('id', planId);
    return { ok: false, errors: [e instanceof Error ? e.message : 'Import failed'] };
  }

  revalidatePath('/admin', 'layout');
  revalidatePath('/', 'layout');
  return {
    ok: true,
    errors: [],
    planId,
    mode: existing ? 'replace' : 'create',
    counts: result.counts,
  };
}
