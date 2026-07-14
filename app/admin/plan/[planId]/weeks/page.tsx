import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireOwner } from '@/lib/auth/owner';
import { getWeeks } from '@/lib/db';
import type { PlanWeek } from '@/lib/types/database';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/data-table';
import { Collapse } from '@/components/admin/collapse';
import { CrudRow } from '@/components/admin/crud-row';
import { EntityForm } from '@/components/admin/entity-form';
import { Field, Input, Textarea, Checkbox } from '@/components/admin/field';
import { PlusGlyph } from '@/components/admin/icons';
import { getPlanOrNull } from '@/app/admin/_lib/queries';
import { upsertWeek, deleteWeek } from '@/app/admin/plan/actions';
import { staggerStyle } from '@/lib/design/motion';

/** Shared field set for both the create and edit forms. */
function WeekFields({ week }: { week?: PlanWeek }) {
  const key = week?.id ?? 'new';
  return (
    <>
      {week ? <input type="hidden" name="id" value={week.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Week index" htmlFor={`wi-${key}`} hint="required">
          <Input id={`wi-${key}`} name="week_index" type="number" defaultValue={week?.week_index ?? ''} required />
        </Field>
        <Field label="Phase label" htmlFor={`pl-${key}`}>
          <Input id={`pl-${key}`} name="phase_label" defaultValue={week?.phase_label ?? ''} />
        </Field>
        <Field label="Run days" htmlFor={`rd-${key}`}>
          <Input id={`rd-${key}`} name="run_days" type="number" defaultValue={week?.run_days ?? ''} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="Planned km" htmlFor={`pk-${key}`}>
          <Input id={`pk-${key}`} name="planned_km" type="number" step="0.01" defaultValue={week?.planned_km ?? ''} />
        </Field>
        <Field label="Range min km" htmlFor={`rmin-${key}`}>
          <Input id={`rmin-${key}`} name="range_min_km" type="number" step="0.01" defaultValue={week?.range_min_km ?? ''} />
        </Field>
        <Field label="Range max km" htmlFor={`rmax-${key}`}>
          <Input id={`rmax-${key}`} name="range_max_km" type="number" step="0.01" defaultValue={week?.range_max_km ?? ''} />
        </Field>
        <Field label="Long run km" htmlFor={`lr-${key}`}>
          <Input id={`lr-${key}`} name="long_run_km" type="number" step="0.01" defaultValue={week?.long_run_km ?? ''} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Previous text" htmlFor={`pt-${key}`}>
          <Input id={`pt-${key}`} name="previous_text" defaultValue={week?.previous_text ?? ''} />
        </Field>
        <Field label="Percent change text" htmlFor={`pc-${key}`}>
          <Input id={`pc-${key}`} name="pct_change_text" defaultValue={week?.pct_change_text ?? ''} />
        </Field>
      </div>

      <Field label="Coaching note" htmlFor={`cn-${key}`} className="mt-4">
        <Textarea id={`cn-${key}`} name="coaching_note" defaultValue={week?.coaching_note ?? ''} />
      </Field>
      <Field label="Performance target" htmlFor={`pf-${key}`} className="mt-4">
        <Textarea id={`pf-${key}`} name="performance_target" defaultValue={week?.performance_target ?? ''} />
      </Field>
      <Field label="Injury target" htmlFor={`it-${key}`} className="mt-4">
        <Textarea id={`it-${key}`} name="injury_target" defaultValue={week?.injury_target ?? ''} />
      </Field>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Bike note" htmlFor={`bn-${key}`}>
          <Input id={`bn-${key}`} name="bike_note" defaultValue={week?.bike_note ?? ''} />
        </Field>
        <Field label="Strength note" htmlFor={`sn-${key}`}>
          <Input id={`sn-${key}`} name="strength_note" defaultValue={week?.strength_note ?? ''} />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <Checkbox name="is_cutback" label="Cutback" defaultChecked={week?.is_cutback} />
        <Checkbox name="is_taper" label="Taper" defaultChecked={week?.is_taper} />
        <Checkbox name="is_race_week" label="Race week" defaultChecked={week?.is_race_week} />
        <Checkbox name="is_peak" label="Peak" defaultChecked={week?.is_peak} />
      </div>
    </>
  );
}

export default async function Page({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await requireOwner();
  const plan = await getPlanOrNull(planId);
  if (!plan) notFound();
  const supabase = await createServerSupabaseClient();
  const weeks = await getWeeks(supabase, planId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Weeks"
        description="Weekly volume, ranges, and flags."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Plan', href: '/admin/plan' },
          { label: plan.title, href: `/admin/plan/${planId}` },
          { label: 'Weeks' },
        ]}
      />

      <div className="grid gap-3">
        {weeks.length === 0 ? (
          <EmptyState title="No weeks yet" description="Add the first week below." />
        ) : (
          weeks.map((week, i) => (
            <div key={week.id} className="sd-enter" style={staggerStyle(i)}>
              <CrudRow
                title={`Week ${week.week_index}${week.phase_label ? ' · ' + week.phase_label : ''}`}
                subtitle={`Planned ${week.planned_km ?? '--'} km · range ${week.range_min_km ?? '?'}-${week.range_max_km ?? '?'}`}
                deleteAction={deleteWeek.bind(null, planId, week.id)}
                deleteConfirm={`Delete week ${week.week_index}?`}
              >
                <EntityForm action={upsertWeek.bind(null, planId)} submitLabel="Save week">
                  <WeekFields week={week} />
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
              <PlusGlyph width={14} height={14} /> Add week
            </span>
          }
        >
          <EntityForm action={upsertWeek.bind(null, planId)} submitLabel="Add week">
            <WeekFields />
          </EntityForm>
        </Collapse>
      </div>
    </div>
  );
}
