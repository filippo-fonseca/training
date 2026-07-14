'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { upsertHealthEntry } from '@/lib/db';
import type { TrafficLight } from '@/lib/types/database';
import { str, num, int, bool, fail, OK, dbMessage, type ActionResult } from '@/app/admin/_lib/form';

const GATES = ['green', 'yellow', 'red'] as const;

// health_entries is owner-only end to end (D1); this never touches a public route.
function revalidateHealth() {
  revalidatePath('/admin/health', 'page');
}

export async function saveHealthEntry(
  planId: string,
  planDayId: string,
  entryDate: string,
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const trafficLightRaw = str(fd, 'traffic_light');
  const trafficLight =
    trafficLightRaw && (GATES as readonly string[]).includes(trafficLightRaw) ? (trafficLightRaw as TrafficLight) : null;

  try {
    await upsertHealthEntry(supabase, {
      plan_id: planId,
      plan_day_id: planDayId,
      entry_date: entryDate,
      knee_before: int(fd, 'knee_before'),
      knee_during: int(fd, 'knee_during'),
      knee_after: int(fd, 'knee_after'),
      knee_next_morning: int(fd, 'knee_next_morning'),
      foot_status: str(fd, 'foot_status'),
      calf_score: int(fd, 'calf_score'),
      gait_normal: bool(fd, 'gait_normal'),
      stairs_normal: bool(fd, 'stairs_normal'),
      pain_quality: str(fd, 'pain_quality'),
      modification: str(fd, 'modification'),
      traffic_light: trafficLight,
      sleep_hours: num(fd, 'sleep_hours'),
      sleep_quality: str(fd, 'sleep_quality'),
      resting_hr: int(fd, 'resting_hr'),
      hrv: int(fd, 'hrv'),
      garmin_readiness: str(fd, 'garmin_readiness'),
      energy: str(fd, 'energy'),
      stress: str(fd, 'stress'),
      body_mass: num(fd, 'body_mass'),
      soreness: int(fd, 'soreness'),
      hydration_appetite: str(fd, 'hydration_appetite'),
      notes: str(fd, 'notes'),
    });
  } catch (e) {
    return fail(dbMessage('Save health entry', e instanceof Error ? e.message : 'unknown error'));
  }
  revalidateHealth();
  return OK;
}
