'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { isOwnerEmail } from '@/lib/auth/owner';

export interface LoginState {
  error: string | null;
}

/** Only same-origin admin paths are valid post-login destinations. */
function safeRedirect(target: string | null | undefined): string {
  if (!target) return '/admin';
  if (!target.startsWith('/admin')) return '/admin';
  return target;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (m.includes('email not confirmed')) {
    return 'This email has not been confirmed yet.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  return 'Could not sign you in. Please try again.';
}

/** Email + password sign-in (React 19 useActionState signature). */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = safeRedirect(String(formData.get('redirectTo') ?? ''));

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }
  // Owner-only app: reject non-owner emails before touching the auth server.
  if (!isOwnerEmail(email)) {
    return { error: 'This account is not the owner of this tracker.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect(redirectTo);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
