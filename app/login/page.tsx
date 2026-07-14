import type { Metadata } from 'next';
import { BoldAmbient } from '@/components/ui/bold-ambient';
import { Panel } from '@/components/ui/panel';
import { LoginForm } from '@/components/admin/login-form';

export const metadata: Metadata = {
  title: 'Sign in · Training Tracker',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-12">
      <BoldAmbient fixed />
      <div className="sd-enter-hero relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-sd-accent" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sd-ink">
              The Comeback · Admin
            </span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-sd-ink">Owner sign-in</h1>
          <p className="text-sm text-sd-ink-faint">Admin access to the training tracker.</p>
        </div>
        <Panel className="p-6">
          <LoginForm redirectTo={redirectTo} />
        </Panel>
        <p className="mt-4 text-center text-tiny text-sd-ink-faint">
          This area is restricted to the plan owner.
        </p>
      </div>
    </main>
  );
}
