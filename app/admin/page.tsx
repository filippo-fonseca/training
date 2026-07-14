import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { StatusPill } from '@/components/ui/status-pill';
import { PlanGlyph, ImportGlyph, GearGlyph } from '@/components/admin/icons';
import { listPlans } from '@/app/admin/_lib/queries';
import { formatKm, formatDateRange } from '@/app/admin/_lib/format';

const QUICK_LINKS = [
  { href: '/admin/plan', label: 'Plan', desc: 'Edit phases, weeks, days, and sessions.', icon: <PlanGlyph /> },
  { href: '/admin/import', label: 'Import', desc: 'Load a plan from structured JSON.', icon: <ImportGlyph /> },
  { href: '/admin/settings', label: 'Settings', desc: 'Owner account and app info.', icon: <GearGlyph /> },
];

export default async function AdminHome() {
  const { ok, plans, error } = await listPlans();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Owner console"
        description="Manage the training plan and its structured data. Public surfaces read the same tables through row-level security."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Panel interactive className="flex h-full flex-col gap-2 p-4">
              <span className="text-sd-ink-dull">{l.icon}</span>
              <span className="text-sm font-semibold text-sd-ink">{l.label}</span>
              <span className="text-xs text-sd-ink-faint">{l.desc}</span>
            </Panel>
          </Link>
        ))}
      </div>

      <h2 className="sd-stat-label mb-3 mt-8">Plans</h2>
      {!ok ? (
        <Panel className="p-5">
          <p className="text-sm text-sd-ink-dull">
            Could not reach the database. Confirm the Supabase project is configured and the
            migrations and seed have been applied.
          </p>
          {error ? <p className="mt-2 text-xs text-sd-ink-faint">{error}</p> : null}
        </Panel>
      ) : plans.length === 0 ? (
        <Panel className="p-5">
          <p className="text-sm text-sd-ink-dull">
            No plans yet. Import one from JSON or create a plan to get started.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href="/admin/import" className="sd-btn sd-btn-primary">
              Import a plan
            </Link>
            <Link href="/admin/plan" className="sd-btn sd-btn-quiet">
              Manage plans
            </Link>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {plans.map((p) => (
            <Link key={p.id} href={`/admin/plan/${p.id}`}>
              <Panel interactive className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-sd-ink">{p.title}</span>
                    <StatusPill tone={p.status === 'active' ? 'active' : 'idle'} label={p.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-sd-ink-faint">
                    {p.race_name ?? 'No race set'} · {formatDateRange(p.start_date, p.end_date)}
                  </p>
                </div>
                <span className="sd-numeral shrink-0 text-sm text-sd-ink-dull">
                  {formatKm(p.total_planned_km)}
                </span>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
