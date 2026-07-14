import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireOwner } from '@/lib/auth/owner';
import { getMilestones } from '@/lib/db';
import type { Milestone } from '@/lib/types/database';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/data-table';
import { Collapse } from '@/components/admin/collapse';
import { CrudRow } from '@/components/admin/crud-row';
import { EntityForm } from '@/components/admin/entity-form';
import { Field, Input, Textarea, Select } from '@/components/admin/field';
import { PlusGlyph } from '@/components/admin/icons';
import { getPlanOrNull } from '@/app/admin/_lib/queries';
import { upsertMilestone, deleteMilestone } from '@/app/admin/plan/actions';
import { staggerStyle } from '@/lib/design/motion';

const MILESTONE_TYPES = [
  'decision_checkpoint',
  'gated_long_run',
  'key_workout',
  'taper_start',
  'race',
  'cutback_week',
  'post_race',
] as const;

/** Shared field set for both the create and edit forms. */
function MilestoneFields({ milestone }: { milestone?: Milestone }) {
  const key = milestone?.id ?? 'new';
  return (
    <>
      {milestone ? <input type="hidden" name="id" value={milestone.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Order index" htmlFor={`mi-${key}`} hint="required">
          <Input id={`mi-${key}`} name="milestone_index" type="number" defaultValue={milestone?.milestone_index ?? ''} required />
        </Field>
        <Field label="Type" htmlFor={`ty-${key}`}>
          <Select id={`ty-${key}`} name="type" defaultValue={milestone?.type ?? 'key_workout'} required>
            {MILESTONE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Week number" htmlFor={`wn-${key}`}>
          <Input id={`wn-${key}`} name="week_number" type="number" defaultValue={milestone?.week_number ?? ''} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor={`ti-${key}`}>
          <Input id={`ti-${key}`} name="title" defaultValue={milestone?.title ?? ''} required />
        </Field>
        <Field label="Date" htmlFor={`da-${key}`}>
          <Input id={`da-${key}`} name="date" type="date" defaultValue={milestone?.date ?? ''} />
        </Field>
      </div>

      <Field label="Description" htmlFor={`de-${key}`} className="mt-4">
        <Textarea id={`de-${key}`} name="description" defaultValue={milestone?.description ?? ''} />
      </Field>
      <Field label="Green criteria" htmlFor={`gc-${key}`} className="mt-4">
        <Textarea id={`gc-${key}`} name="green_criteria" defaultValue={milestone?.green_criteria ?? ''} />
      </Field>
      <Field label="Yellow criteria" htmlFor={`yc-${key}`} className="mt-4">
        <Textarea id={`yc-${key}`} name="yellow_criteria" defaultValue={milestone?.yellow_criteria ?? ''} />
      </Field>
      <Field label="Red criteria" htmlFor={`rc-${key}`} className="mt-4">
        <Textarea id={`rc-${key}`} name="red_criteria" defaultValue={milestone?.red_criteria ?? ''} />
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
  const milestones = await getMilestones(supabase, planId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Milestones"
        description="Key events, gated runs, and the race."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Plan', href: '/admin/plan' },
          { label: plan.title, href: `/admin/plan/${planId}` },
          { label: 'Milestones' },
        ]}
      />

      <div className="grid gap-3">
        {milestones.length === 0 ? (
          <EmptyState title="No milestones yet" description="Add the first milestone below." />
        ) : (
          milestones.map((m, i) => (
            <div key={m.id} className="sd-enter" style={staggerStyle(i)}>
              <CrudRow
                title={`${m.milestone_index}. ${m.title}`}
                subtitle={`${m.type}${m.date ? ' · ' + m.date : ''}`}
                deleteAction={deleteMilestone.bind(null, planId, m.id)}
                deleteConfirm={`Delete milestone "${m.title}"?`}
              >
                <EntityForm action={upsertMilestone.bind(null, planId)} submitLabel="Save milestone">
                  <MilestoneFields milestone={m} />
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
              <PlusGlyph width={14} height={14} /> Add milestone
            </span>
          }
        >
          <EntityForm action={upsertMilestone.bind(null, planId)} submitLabel="Add milestone">
            <MilestoneFields />
          </EntityForm>
        </Collapse>
      </div>
    </div>
  );
}
