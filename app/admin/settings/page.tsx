import { requireOwner } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { signOut } from '@/app/login/actions';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

async function readSettings(): Promise<Record<string, string | null>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from('app_settings').select('key, value');
    return Object.fromEntries((data ?? []).map((s) => [s.key, s.value]));
  } catch {
    return {};
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-sd-divider py-3 last:border-b-0">
      <span className="sd-stat-label">{label}</span>
      <span className="sd-numeral text-sm text-sd-ink">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const { email } = await requireOwner();
  const settings = await readSettings();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Owner account and app configuration. The admin email and timezone are set in the database (app_settings) and enforced by row-level security."
      />

      <Panel className="p-5">
        <Row label="Signed in as" value={email} />
        <Row label="Admin email" value={settings.admin_email ?? '—'} />
        <Row label="Timezone" value={settings.timezone ?? 'America/New_York'} />
      </Panel>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-sd-ink-faint">
          Signing out clears the owner session on this device.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="quiet">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
