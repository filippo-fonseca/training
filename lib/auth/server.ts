// Server-side Supabase client for the App Router: cookie-backed auth via
// @supabase/ssr. Used by Server Components, Server Actions, and Route Handlers.
// The runtime only ever uses the public (publishable/anon) key; RLS is the
// security boundary and owner writes are gated by the authenticated JWT email
// (see is_owner() in the migrations). The service role key is never used here.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';
import type { TypedSupabaseClient } from '@/lib/db';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function publicKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
}

/**
 * Cookie-backed server client. Reads and refreshes the Supabase auth cookies
 * through Next's cookie store. When called from a pure Server Component the
 * cookie writes are no-ops (Next forbids mutating cookies during render); the
 * middleware keeps the session fresh, so that is safe to ignore.
 */
export async function createServerSupabaseClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');

  return createServerClient<Database>(url, publicKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component render context: cookie mutation is not allowed.
          // Middleware (lib/auth/middleware.ts) refreshes the session instead.
        }
      },
    },
  }) as unknown as TypedSupabaseClient;
}
