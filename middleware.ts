import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';

// Gate the admin area and keep the owner session fresh. Public routes are anon
// (RLS-safe) and do not need the session cookie, so we only match /admin + /login.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/login'],
};
