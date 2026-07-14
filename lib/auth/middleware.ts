// Edge middleware session refresh + admin gate. Runs the @supabase/ssr cookie
// dance so the auth session stays fresh, then bounces:
//   - unauthenticated / non-owner requests to /admin/*  ->  /login
//   - already-authenticated owner hitting /login          ->  /admin
// The owner check here is UX only; RLS is_owner() is the definitive boundary.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';
import { isOwnerEmail } from './owner';

const LOGIN_PATH = '/login';
const ADMIN_HOME = '/admin';

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;
  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  const isLogin = path === LOGIN_PATH;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured: never expose the admin area; let /login render so
  // its own "not configured" messaging can show.
  if (!url || !key) {
    if (isAdmin) return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() revalidates the token with the auth server (not just the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const owner = isOwnerEmail(user?.email);

  if (isAdmin && !owner) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    redirectUrl.search = '';
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLogin && owner) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ADMIN_HOME;
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
