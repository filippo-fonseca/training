// Service-role Supabase client — SERVER-ONLY, cron-ONLY.
//
// The secured Vercel cron sync route runs with no owner session, so the RLS
// is_owner() boundary would block it from reading strava_connections (private)
// and writing strava_activities. This factory returns a service-role client that
// bypasses RLS, gated on SUPABASE_SERVICE_ROLE_KEY being present. It must never
// be imported by a client component — keep it behind the API/action layer.
//
// The interactive paths (OAuth callback, Sync now, manual link/unlink) do NOT
// use this; they run on the owner cookie client where is_owner() still applies.

import { createSupabaseClient, type TypedSupabaseClient } from '@/lib/db/client';

/** Service-role client, or null when the key is not configured. */
export function createStravaServiceClient(): TypedSupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

/** True when the service-role key is configured (cron can write). */
export function hasStravaServiceRole(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
