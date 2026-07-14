'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { upsertLog, deleteLog } from '@/lib/db';
import type { TrafficLight } from '@/lib/types/database';
import { str, num, int, fail, OK, dbMessage, type ActionResult } from '@/app/admin/_lib/form';
import { deriveActualPaceText } from '@/components/logging/pace';

const STATUSES = ['completed', 'modified', 'skipped'] as const;
const GATES = ['green', 'yellow', 'red'] as const;

// Logging a day changes what the public dashboard, calendar, day detail, and
// progress views read (they all read session_logs through RLS), so every save
// refreshes the whole public tree plus the log list itself.
function revalidateAfterLog() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/log', 'page');
}

export async function saveSessionLog(planId: string, planDayId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const statusRaw = str(fd, 'status');
  const status = statusRaw && (STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : 'completed';
  const trafficLightRaw = str(fd, 'traffic_light');
  const trafficLight =
    trafficLightRaw && (GATES as readonly string[]).includes(trafficLightRaw) ? (trafficLightRaw as TrafficLight) : null;

  const distance = num(fd, 'actual_distance_km');
  const duration = num(fd, 'actual_duration_min');
  const paceOverride = str(fd, 'actual_pace_text');

  try {
    await upsertLog(supabase, {
      plan_id: planId,
      plan_day_id: planDayId,
      actual_distance_km: distance,
      actual_duration_min: duration,
      actual_pace_text: paceOverride ?? deriveActualPaceText(distance, duration),
      actual_rpe: int(fd, 'actual_rpe'),
      actual_avg_hr: int(fd, 'actual_avg_hr'),
      completed: status !== 'skipped',
      modified: status === 'modified',
      why_modified: str(fd, 'why_modified'),
      tomorrow_change: str(fd, 'tomorrow_change'),
      traffic_light: trafficLight,
      shoe_used: str(fd, 'shoe_used'),
      notes: str(fd, 'notes'),
    });
  } catch (e) {
    return fail(dbMessage('Save log', e instanceof Error ? e.message : 'unknown error'));
  }
  revalidateAfterLog();
  return OK;
}

/** Remove a mislogged day's entry entirely (owner-guarded; RLS does the real enforcement). */
export async function deleteSessionLog(planDayId: string): Promise<void> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();
  await deleteLog(supabase, planDayId);
  revalidateAfterLog();
}
