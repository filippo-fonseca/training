import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { StatusPill } from '@/components/ui/status-pill';
import { Collapse } from '@/components/admin/collapse';
import { EntityForm } from '@/components/admin/entity-form';
import { Field, Input } from '@/components/admin/field';
import { PlusGlyph } from '@/components/admin/icons';
import { listPlans } from '@/app/admin/_lib/queries';
import { formatDateRange, formatKm } from '@/app/admin/_lib/format';
import { createPlan } from '@/app/admin/plan/actions';

export default async function PlanListPage() {
  const { ok, plans, error } = await listPlans();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Plans"
        description="Every training plan in the engine. Edit a plan's structure, or import a new one from JSON."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Plan' }]}
      />

      {!ok ? (
        <Panel className="p-5">
          <p className="text-sm text-sd-ink-dull">
            Could not reach the database. Confirm Supabase is configured and migrations plus seed
            have been applied.
          </p>
          {error ? <p className="mt-2 text-xs text-sd-ink-faint">{error}</p> : null}
        </Panel>
      ) : (
        <div className="grid gap-3">
          {plans.length === 0 ? (
            <Panel className="p-5">
              <p className="text-sm text-sd-ink-dull">No plans yet. Create one below or import from JSON.</p>
            </Panel>
          ) : (
            plans.map((p) => (
              <Link key={p.id} href={`/admin/plan/${p.id}`}>
                <Panel interactive className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-sd-ink">{p.title}</span>
                      <StatusPill tone={p.status === 'active' ? 'active' : 'idle'} label={p.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-sd-ink-faint">
                      <span className="sd-numeral">{p.slug}</span> · {formatDateRange(p.start_date, p.end_date)}
                    </p>
                  </div>
                  <span className="sd-numeral shrink-0 text-sm text-sd-ink-dull">
                    {formatKm(p.total_planned_km)}
                  </span>
                </Panel>
              </Link>
            ))
          )}
        </div>
      )}

      <div className="mt-6">
        <Collapse
          tone="accent"
          summary={
            <span className="inline-flex items-center gap-2">
              <PlusGlyph width={14} height={14} /> New plan
            </span>
          }
        >
          <EntityForm action={createPlan} submitLabel="Create plan">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug" htmlFor="new-slug" hint="lowercase-hyphenated">
                <Input id="new-slug" name="slug" placeholder="spring-2027" required />
              </Field>
              <Field label="Title" htmlFor="new-title">
                <Input id="new-title" name="title" placeholder="Spring 2027 Marathon Build" required />
              </Field>
            </div>
          </EntityForm>
        </Collapse>
      </div>
    </div>
  );
}
