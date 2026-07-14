// Single-owner authorization. The owner is the authenticated Supabase user whose
// email equals ADMIN_EMAIL. This mirrors the definitive check in the database
// (is_owner() compares the JWT email to app_settings.admin_email); here it is
// the UX/redirect gate for the admin app. RLS remains the real security boundary.

import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './server';

/** The configured owner email, normalized, or null when unset. */
export function getAdminEmail(): string | null {
  const raw = process.env.ADMIN_EMAIL;
  const email = raw?.trim().toLowerCase();
  return email ? email : null;
}

/** True when the given email is the configured owner. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const admin = getAdminEmail();
  if (!admin || !email) return false;
  return email.trim().toLowerCase() === admin;
}

/** The current authenticated user, or null. Verified against the auth server. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export interface OwnerSession {
  user: User;
  email: string;
}

/**
 * Server guard for admin surfaces. Redirects to /login unless the caller is the
 * authenticated owner. Use at the top of admin layouts/pages and server actions.
 */
export async function requireOwner(): Promise<OwnerSession> {
  const user = await getSessionUser();
  if (!user || !isOwnerEmail(user.email)) {
    redirect('/login');
  }
  return { user, email: user.email as string };
}
