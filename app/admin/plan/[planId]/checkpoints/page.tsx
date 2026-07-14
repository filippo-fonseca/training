import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireOwner } from '@/lib/auth/owner';
import { getCheckpoints } from '@/lib/db';
import type { Checkpoint } from '@/lib/types/database';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/data-table';
import { Collapse } from '@/components/admin/collapse';
import { CrudRow } from '@/components/admin/crud-row';
import { EntityForm } from '@/components/admin/entity-form';
import { Field, Input, Textarea } from '@/components/admin/field';
import { PlusGlyph } from '@/components/admin/icons';
import { getPlanOrNull } from '@/app/admin/_lib/queries';
import { upsertCheckpoint, deleteCheckpoint } from '@/app/admin/plan/actions';
import { staggerStyle } from '@/lib/design/motion';

/** Shared field set for both the create and edit forms. */
function CheckpointFields({ checkpoint }: { checkpoint?: Checkpoint }) {
  const key = checkpoint?.id ?? 'new';
  return (
    <>
      {checkpoint ? <input type="hidden" name="id" value={checkpoint.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Order index" htmlFor={`ci-${key}`} hint="required">
          <Input id={`ci-${key}`} name="checkpoint_index" type="number" defaultValue={checkpoint?.checkpoint_index ?? ''} required />
        </Field>
        <Field label="After week" htmlFor={`aw-${key}`}>
          <Input id={`aw-${key}`} name="after_week" type="number" defaultValue={checkpoint?.after_week ?? ''} />
        </Field>
      </div>

      <Field label="Title" htmlFor={`ti-${key}`} className="mt-4">
        <Input id={`ti-${key}`} name="title" defaultValue={checkpoint?.title ?? ''} required />
      </Field>
      <Field label="Green action" htmlFor={`ga-${key}`} className="mt-4">
        <Textarea id={`ga-${key}`} name="green_action" defaultValue={checkpoint?.green_action ?? ''} />
      </Field>
      <Field label="Yellow action" htmlFor={`ya-${key}`} className="mt-4">
        <Textarea id={`ya-${key}`} name="yellow_action" defaultValue={checkpoint?.yellow_action ?? ''} />
      </Field>
      <Field label="Red action" htmlFor={`ra-${key}`} className="mt-4">
        <Textarea id={`ra-${key}`} name="red_action" defaultValue={checkpoint?.red_action ?? ''} />
      </Field>
    </>
  );
}

export default async function Page({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await requireOwner();
  const plan = await getPlanOrNull(planId);
  if (!plan) notFound();
  const supabase = await createServerSupabaseClient();
  const checkpoints = await getCheckpoints(supabase, planId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Checkpoints"
        description="Traffic-light decision governance."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Plan', href: '/admin/plan' },
          { label: plan.title, href: `/admin/plan/${planId}` },
          { label: 'Checkpoints' },
        ]}
      />

      <div className="grid gap-3">
        {checkpoints.length === 0 ? (
          <EmptyState title="No checkpoints yet" description="Add the first checkpoint below." />
        ) : (
          checkpoints.map((c, i) => (
            <div key={c.id} className="sd-enter" style={staggerStyle(i)}>
              <CrudRow
                title={`${c.checkpoint_index}. ${c.title}`}
                subtitle={c.after_week != null ? `After week ${c.after_week}` : undefined}
                deleteAction={deleteCheckpoint.bind(null, planId, c.id)}
                deleteConfirm={`Delete checkpoint "${c.title}"?`}
              >
                <EntityForm action={upsertCheckpoint.bind(null, planId)} submitLabel="Save checkpoint">
                  <CheckpointFields checkpoint={c} />
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
              <PlusGlyph width={14} height={14} /> Add checkpoint
            </span>
          }
        >
          <EntityForm action={upsertCheckpoint.bind(null, planId)} submitLabel="Add checkpoint">
            <CheckpointFields />
          </EntityForm>
        </Collapse>
      </div>
    </div>
  );
}
