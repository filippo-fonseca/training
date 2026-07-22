import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { requireOwner } from '@/lib/auth/owner';
import { signOut } from '@/app/login/actions';
import { PageShell } from '@/components/ui/page-shell';
import { AdminNav, AdminMobileNav } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: 'Admin · Training Tracker',
  robots: { index: false, follow: false },
};

/** Sidebar identity lockup in the dashboard masthead grammar: an accent tick
 *  plus the "THE COMEBACK" wordmark in mono small-caps. */
function AdminBrand() {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="size-1.5 rounded-full bg-sd-accent" />
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sd-ink">
        The Comeback
      </span>
    </div>
  );
}

/** The admin masthead strip, in the dashboard's grammar: left the
 *  "THE COMEBACK · ADMIN" mono small-caps wordmark with an accent tick; right
 *  the owner email chip and sign-out. */
function AdminTopbar({ email }: { email: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="size-1.5 rounded-full bg-sd-accent" />
        <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sd-ink">
          The Comeback · Admin
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center rounded-full border border-sd-line bg-sd-darker-box px-2.5 py-1 font-mono text-[11px] text-sd-ink-dull sm:inline-flex">
          {email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="sd-btn sd-btn-quiet px-3 py-1.5 text-tiny"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { email } = await requireOwner();

  return (
    <PageShell
      brand={<AdminBrand />}
      nav={<AdminNav />}
      mobileNav={<AdminMobileNav />}
      topbar={<AdminTopbar email={email} />}
    >
      {children}
    </PageShell>
  );
}
