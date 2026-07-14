// Supabase client factories. The app runtime uses only the public
// (anon/publishable) key — never the service role key. Row-level security makes
// the public key safe to expose to the browser; owner-only writes are gated by
// the caller's authenticated JWT email (see is_owner()).

import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type TypedSupabaseClient = SupabaseClient<Database>;

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

/**
 * Browser client — reads NEXT_PUBLIC_ env vars. Prefers the publishable key and
 * falls back to the anon key (both are public and RLS-protected).
 */
export function createBrowserSupabaseClient(): TypedSupabaseClient {
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  // @supabase/ssr's createBrowserClient and @supabase/supabase-js's SupabaseClient
  // carry slightly different generic arities; the runtime object is a genuine
  // SupabaseClient<Database>, so we normalize the static type here.
  return createBrowserClient<Database>(url, key) as unknown as TypedSupabaseClient;
}

/**
 * Generic typed client from an explicit url + public key. Useful for server
 * components / route handlers / scripts that supply their own credentials and
 * (optionally) an auth token. Never pass the service role key here in runtime code.
 */
export function createSupabaseClient(
  url: string,
  key: string,
  accessToken?: string,
): TypedSupabaseClient {
  return createClient<Database>(url, key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false },
  });
}
