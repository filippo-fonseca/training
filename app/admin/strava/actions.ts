'use server';

// Owner-only Strava admin actions. Every one runs on the owner cookie client, so
// RLS is_owner() remains the boundary (the service role is used only by cron).

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import type { TypedSupabaseClient } from '@/lib/db';
import {
  deleteConnection,
  runAutoLink,
  runStravaSync,
  setActivityPlanDayById,
  type AutoLinkSummary,
  type SyncResult,
} from '@/lib/strava';

async function ownerClient(): Promise<TypedSupabaseClient> {
  await requireOwner();
  return createServerSupabaseClient();
}

function revalidate() {
  revalidatePath('/admin/strava');
  // Public journey reads strava_activities through RLS; refresh it too.
  revalidatePath('/', 'layout');
}

/** Pull recent activities and auto-match. Returns a summary for the caller. */
export async function syncNow(): Promise<SyncResult> {
  const supabase = await ownerClient();
  const result = await runStravaSync(supabase);
  revalidate();
  return result;
}

/** useActionState-compatible wrapper so the button can render the last result. */
export async function syncNowAction(
  _prev: SyncResult | null,
  _formData: FormData,
): Promise<SyncResult> {
  return syncNow();
}

/**
 * Auto-link today's Strava runs to the plan. Runs the shared core directly on
 * the owner cookie client (RLS applies) with force semantics so it bypasses the
 * 22:00-Chicago hour guard for an on-demand admin run. Never posts the cron
 * secret to the browser (item 5): this is a server action, not an HTTP call.
 */
export async function autoLinkToday(): Promise<AutoLinkSummary> {
  const supabase = await ownerClient();
  const result = await runAutoLink(supabase, { force: true });
  revalidate();
  return result;
}

/** useActionState-compatible wrapper so the button can render the last summary. */
export async function autoLinkTodayAction(
  _prev: AutoLinkSummary | null,
  _formData: FormData,
): Promise<AutoLinkSummary> {
  return autoLinkToday();
}

/** Manually link an activity to a plan day. */
export async function linkActivity(formData: FormData): Promise<void> {
  const supabase = await ownerClient();
  const activityId = String(formData.get('activity_id') ?? '').trim();
  const planDayId = String(formData.get('plan_day_id') ?? '').trim();
  if (!activityId || !planDayId) return;

  // Resolve the plan the day belongs to so plan_id stays consistent.
  const { data: day } = await supabase
    .from('plan_days')
    .select('plan_id')
    .eq('id', planDayId)
    .maybeSingle();
  if (!day) return;

  await setActivityPlanDayById(supabase, activityId, planDayId, day.plan_id);
  revalidate();
}

/** Clear an activity's plan-day link (back to unmatched). */
export async function unlinkActivity(formData: FormData): Promise<void> {
  const supabase = await ownerClient();
  const activityId = String(formData.get('activity_id') ?? '').trim();
  if (!activityId) return;
  await setActivityPlanDayById(supabase, activityId, null, null);
  revalidate();
}

/** Disconnect Strava: delete the stored tokens. Activities are kept. */
export async function disconnect(): Promise<void> {
  const supabase = await ownerClient();
  await deleteConnection(supabase);
  revalidate();
}
