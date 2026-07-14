// Owner-context reads for the admin app. These run through the cookie-backed
// server client, so RLS sees the authenticated owner. Reads that later units
// also need live in lib/db; this module only adds admin-specific listings and a
// safe "is the database reachable / seeded" probe used for graceful states.

import { createServerSupabaseClient } from '@/lib/auth/server';
import type { Plan } from '@/lib/types/database';

export interface PlanSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  race_name: string | null;
  race_date: string | null;
  start_date: string | null;
  end_date: string | null;
  total_planned_km: number | null;
}

export interface PlansResult {
  ok: boolean;
  plans: PlanSummary[];
  error?: string;
}

/** List every plan (owner context). Never throws: returns ok:false on failure so
 *  admin pages can render a "not seeded yet / not configured" state. */
export async function listPlans(): Promise<PlansResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('plans')
      .select('id, slug, title, status, race_name, race_date, start_date, end_date, total_planned_km')
      .order('created_at', { ascending: true });
    if (error) return { ok: false, plans: [], error: error.message };
    return { ok: true, plans: (data ?? []) as PlanSummary[] };
  } catch (e) {
    return { ok: false, plans: [], error: e instanceof Error ? e.message : 'unknown error' };
  }
}

/** A single plan by id, or null. Throws only on unexpected errors. */
export async function getPlanOrNull(planId: string): Promise<Plan | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('plans').select('*').eq('id', planId).maybeSingle();
  if (error) throw new Error(`getPlanOrNull(${planId}): ${error.message}`);
  return data ?? null;
}
