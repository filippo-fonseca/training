// Strava DB access — SERVER-ONLY. Every function takes a TypedSupabaseClient so
// the caller controls the auth context: the owner cookie client for interactive
// paths, or the service-role client (lib/strava/service.ts) for cron. Single
// owner => a single strava_connections row.

import type { TypedSupabaseClient } from '@/lib/db/client';
import type { Database, StravaActivity, StravaConnection, Json } from '@/lib/types/database';

export type StravaActivityInsert =
  Database['public']['Tables']['strava_activities']['Insert'];
import { TOKEN_REFRESH_BUFFER_S, type StravaConfig } from './config';
import { refreshTokens } from './oauth';
import type { StravaTokenResponse } from './types';

class StravaDbError extends Error {
  constructor(context: string, cause: { message: string } | null) {
    super(`${context}: ${cause?.message ?? 'unknown error'}`);
    this.name = 'StravaDbError';
  }
}

/** The single owner connection, or null when not connected. */
export async function getConnection(
  client: TypedSupabaseClient,
): Promise<StravaConnection | null> {
  const { data, error } = await client
    .from('strava_connections')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new StravaDbError('getConnection', error);
  return data;
}

/** ISO expiry from a token response's unix `expires_at`. */
function expiryIso(token: StravaTokenResponse): string {
  return new Date(token.expires_at * 1000).toISOString();
}

/**
 * Store a freshly-authorized connection. Keeps a single row: updates the
 * existing one (if any), else inserts. Re-linking to a different athlete
 * overwrites the same row.
 */
export async function saveConnection(
  client: TypedSupabaseClient,
  token: StravaTokenResponse,
): Promise<StravaConnection> {
  const existing = await getConnection(client);
  const payload = {
    strava_athlete_id: token.athlete?.id ?? existing?.strava_athlete_id ?? null,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: expiryIso(token),
    scope: token.scope ?? existing?.scope ?? null,
    athlete_summary: (token.athlete as Json | undefined) ?? existing?.athlete_summary ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await client
      .from('strava_connections')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw new StravaDbError('saveConnection(update)', error);
    return data;
  }

  const { data, error } = await client
    .from('strava_connections')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new StravaDbError('saveConnection(insert)', error);
  return data;
}

/** Delete the connection (unlink). Activities are kept. */
export async function deleteConnection(client: TypedSupabaseClient): Promise<void> {
  // `id` is a non-null uuid, so `id is not null` matches every row while still
  // giving PostgREST the required filter (a bare delete is rejected).
  const { error } = await client.from('strava_connections').delete().not('id', 'is', null);
  if (error) throw new StravaDbError('deleteConnection', error);
}

/**
 * Return a valid access token, refreshing (and persisting the rotated refresh
 * token) when the current one is expired or within the refresh buffer.
 */
export async function ensureAccessToken(
  client: TypedSupabaseClient,
  config: StravaConfig,
  connection: StravaConnection,
): Promise<string> {
  const expiresAtMs = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const fresh = expiresAtMs - Date.now() > TOKEN_REFRESH_BUFFER_S * 1000;
  if (fresh && connection.access_token) return connection.access_token;

  if (!connection.refresh_token) {
    throw new StravaDbError('ensureAccessToken', { message: 'no refresh token on connection' });
  }
  const token = await refreshTokens(config, connection.refresh_token);
  const { error } = await client
    .from('strava_connections')
    .update({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: expiryIso(token),
      scope: token.scope ?? connection.scope,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);
  if (error) throw new StravaDbError('ensureAccessToken(persist)', error);
  return token.access_token;
}

/** All synced activities, newest first. */
export async function getActivities(client: TypedSupabaseClient): Promise<StravaActivity[]> {
  const { data, error } = await client
    .from('strava_activities')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw new StravaDbError('getActivities', error);
  return data ?? [];
}

/** The latest activity start_date we have stored (the sync watermark). */
export async function latestActivityStart(
  client: TypedSupabaseClient,
): Promise<string | null> {
  const { data, error } = await client
    .from('strava_activities')
    .select('start_date')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new StravaDbError('latestActivityStart', error);
  return data?.start_date ?? null;
}

/** Upsert activities by strava_id. Does not touch plan_day_id here. */
export async function upsertActivities(
  client: TypedSupabaseClient,
  rows: StravaActivityInsert[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client
    .from('strava_activities')
    .upsert(rows, { onConflict: 'strava_id', ignoreDuplicates: false });
  if (error) throw new StravaDbError('upsertActivities', error);
}

/** Set (or clear) an activity's matched plan day, by strava_id. */
export async function setActivityPlanDay(
  client: TypedSupabaseClient,
  stravaId: number,
  planDayId: string | null,
  planId: string | null,
): Promise<void> {
  const { error } = await client
    .from('strava_activities')
    .update({ plan_day_id: planDayId, plan_id: planId, updated_at: new Date().toISOString() })
    .eq('strava_id', stravaId);
  if (error) throw new StravaDbError('setActivityPlanDay', error);
}

/** Set (or clear) an activity's matched plan day, by row id (UI convenience). */
export async function setActivityPlanDayById(
  client: TypedSupabaseClient,
  id: string,
  planDayId: string | null,
  planId: string | null,
): Promise<void> {
  const { error } = await client
    .from('strava_activities')
    .update({ plan_day_id: planDayId, plan_id: planId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new StravaDbError('setActivityPlanDayById', error);
}
