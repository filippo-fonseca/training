import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { requireOwner } from '@/lib/auth/owner';
import { signOut } from '@/app/login/actions';
import { PageShell } from '@/components/ui/page-shell';
import { AdminNav } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: 'Admin · Training Tracker',
  robots: { index: false, follow: false },
};

function AdminBrand() {
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid size-6 place-items-center rounded-md"
        style={{
          background: 'linear-gradient(160deg, var(--sd-accent-faint), var(--sd-accent-deep))',
          boxShadow: 'var(--sd-bevel), 0 0 16px var(--hud-cyan-glow)',
        }}
      >
        <span className="size-2 rounded-full" style={{ background: 'var(--sd-accent-ink)' }} />
      </span>
      <span className="sd-numeral text-sm font-semibold tracking-tight text-sd-ink">Training</span>
      <span className="sd-stat-label mt-0.5">Admin</span>
    </div>
  );
}

function AdminTopbar({ email }: { email: string }) {
  return (
    <div className="flex w-full items-center gap-3">
      <span className="sd-stat-label">Owner console</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs text-sd-ink-faint sm:inline">{email}</span>
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
    <PageShell brand={<AdminBrand />} nav={<AdminNav />} topbar={<AdminTopbar email={email} />}>
      {children}
    </PageShell>
  );
}
