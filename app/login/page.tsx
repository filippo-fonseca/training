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
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span
            className="grid size-9 place-items-center rounded-sd-tile"
            style={{
              background: 'linear-gradient(160deg, var(--sd-accent-faint), var(--sd-accent-deep))',
              boxShadow: 'var(--sd-bevel), 0 0 18px var(--hud-cyan-glow)',
            }}
          >
            <span className="size-2.5 rounded-full" style={{ background: 'var(--sd-accent-ink)' }} />
          </span>
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
