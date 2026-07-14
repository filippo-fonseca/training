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
 * Claims app_settings.admin_email from ADMIN_EMAIL on the first authenticated
 * request. A no-op once an owner is already set (see bootstrap_admin_email()
 * in 0002_owner_and_triggers.sql), so this is safe to call on every request.
 * ADMIN_EMAIL is the single source of owner identity; this is what persists
 * that choice into the database, where is_owner() and every RLS policy
 * actually enforce it.
 */
async function bootstrapAdminEmail(email: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.rpc('bootstrap_admin_email', { claimed_email: email });
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
  const admin = getAdminEmail();
  if (admin) {
    await bootstrapAdminEmail(admin);
  }
  return { user, email: user.email as string };
}
