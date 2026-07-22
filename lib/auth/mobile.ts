// Bearer-token owner gate for /api/mobile/* routes.
// The Expo app sends the Supabase access token; RLS still enforces is_owner()
// on every query. This helper is the UX/route gate that mirrors requireOwner()
// without cookies or redirects.

import { createClient, type User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseClient, type TypedSupabaseClient } from '@/lib/db/client';
import { getAdminEmail, isOwnerEmail } from '@/lib/auth/owner';

function publicKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  );
}

export function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status });
}

/** Extract `Bearer <jwt>` from the request, or null. */
export function readBearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

export interface MobileOwner {
  user: User;
  email: string;
  accessToken: string;
  /** Anon-key client scoped to this user's JWT (RLS applies). */
  supabase: TypedSupabaseClient;
}

/**
 * Resolve the authenticated owner from a Bearer token.
 * Returns null when missing/invalid/non-owner.
 */
export async function getMobileOwner(req: NextRequest): Promise<MobileOwner | null> {
  const accessToken = readBearer(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicKey();
  if (!accessToken || !url || !key) return null;

  // Verify the JWT against the auth server (not just decode).
  const authClient = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken);
  if (error || !user || !isOwnerEmail(user.email)) return null;

  const admin = getAdminEmail();
  if (admin) {
    // Best-effort bootstrap so RLS is_owner() has app_settings.admin_email.
    const scoped = createSupabaseClient(url, key, accessToken);
    await scoped.rpc('bootstrap_admin_email', { claimed_email: admin });
  }

  return {
    user,
    email: user.email as string,
    accessToken,
    supabase: createSupabaseClient(url, key, accessToken),
  };
}

/** 401 JSON unless the caller is the authenticated owner. */
export async function requireMobileOwner(
  req: NextRequest,
): Promise<MobileOwner | NextResponse> {
  const owner = await getMobileOwner(req);
  if (!owner) return jsonError(401, 'unauthorized');
  return owner;
}
