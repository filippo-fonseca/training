import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireOwner } from '@/lib/auth/owner';
import { getPhases } from '@/lib/db';
import type { PlanPhase } from '@/lib/types/database';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/data-table';
import { Collapse } from '@/components/admin/collapse';
import { CrudRow } from '@/components/admin/crud-row';
import { EntityForm } from '@/components/admin/entity-form';
import { Field, Input, Textarea } from '@/components/admin/field';
import { PlusGlyph } from '@/components/admin/icons';
import { getPlanOrNull } from '@/app/admin/_lib/queries';
import { upsertPhase, deletePhase } from '@/app/admin/plan/actions';
import { staggerStyle } from '@/lib/design/motion';

/** Shared field set for both the create and edit forms. */
function PhaseFields({ phase }: { phase?: PlanPhase }) {
  return (
    <>
      {phase ? <input type="hidden" name="id" value={phase.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Order index" htmlFor={`pi-${phase?.id ?? 'new'}`} hint="unique">
          <Input
            id={`pi-${phase?.id ?? 'new'}`}
            name="phase_index"
            type="number"
            defaultValue={phase?.phase_index ?? ''}
            required
          />
        </Field>
        <Field label="Start week" htmlFor={`sw-${phase?.id ?? 'new'}`}>
          <Input id={`sw-${phase?.id ?? 'new'}`} name="start_week" type="number" defaultValue={phase?.start_week ?? ''} />
        </Field>
        <Field label="End week" htmlFor={`ew-${phase?.id ?? 'new'}`}>
          <Input id={`ew-${phase?.id ?? 'new'}`} name="end_week" type="number" defaultValue={phase?.end_week ?? ''} />
        </Field>
      </div>
      <Field label="Name" htmlFor={`nm-${phase?.id ?? 'new'}`} className="mt-4">
        <Input id={`nm-${phase?.id ?? 'new'}`} name="name" defaultValue={phase?.name ?? ''} required />
      </Field>
      <Field label="Description" htmlFor={`de-${phase?.id ?? 'new'}`} className="mt-4">
        <Textarea id={`de-${phase?.id ?? 'new'}`} name="description" defaultValue={phase?.description ?? ''} />
      </Field>
    </>
  );
}

export default async function PhasesPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await requireOwner();
  const plan = await getPlanOrNull(planId);
  if (!plan) notFound();
  const supabase = await createServerSupabaseClient();
  const phases = await getPhases(supabase, planId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Phases"
        description="Training blocks spanning one or more weeks."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Plan', href: '/admin/plan' },
          { label: plan.title, href: `/admin/plan/${planId}` },
          { label: 'Phases' },
        ]}
      />

      <div className="grid gap-3">
        {phases.length === 0 ? (
          <EmptyState title="No phases yet" description="Add the first training block below." />
        ) : (
          phases.map((phase, i) => (
            <div key={phase.id} className="sd-enter" style={staggerStyle(i)}>
              <CrudRow
                title={`${phase.phase_index}. ${phase.name}`}
                subtitle={
                  phase.start_week != null || phase.end_week != null
                    ? `Weeks ${phase.start_week ?? '?'}-${phase.end_week ?? '?'}`
                    : undefined
                }
                deleteAction={deletePhase.bind(null, planId, phase.id)}
                deleteConfirm={`Delete phase "${phase.name}"?`}
              >
                <EntityForm action={upsertPhase.bind(null, planId)} submitLabel="Save phase">
                  <PhaseFields phase={phase} />
                </EntityForm>
              </CrudRow>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <Collapse
          tone="accent"
          summary={
            <span className="inline-flex items-center gap-2">
              <PlusGlyph width={14} height={14} /> Add phase
            </span>
          }
        >
          <EntityForm action={upsertPhase.bind(null, planId)} submitLabel="Add phase">
            <PhaseFields />
          </EntityForm>
        </Collapse>
      </div>
    </div>
  );
}
