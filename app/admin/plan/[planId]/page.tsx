import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { Field, Input, Textarea, Select } from '@/components/admin/field';
import { EntityForm } from '@/components/admin/entity-form';
import { DeleteButton } from '@/components/admin/delete-button';
import { ChevronRightGlyph } from '@/components/admin/icons';
import { getPlanOrNull, getPlanCounts } from '@/app/admin/_lib/queries';
import { getPlanPrivateNotes } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { updatePlan, deletePlan } from '@/app/admin/plan/actions';
import { staggerStyle } from '@/lib/design/motion';

const SECTIONS = [
  { key: 'phases', label: 'Phases', desc: 'Training blocks spanning weeks.' },
  { key: 'weeks', label: 'Weeks', desc: 'Weekly volume, ranges, and flags.' },
  { key: 'days', label: 'Days', desc: 'Daily sessions, targets, alternatives.' },
  { key: 'milestones', label: 'Milestones', desc: 'Key events and gated runs.' },
  { key: 'checkpoints', label: 'Checkpoints', desc: 'Traffic-light governance.' },
] as const;

export default async function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const supabase = await createServerSupabaseClient();
  const [plan, counts, privateNotes] = await Promise.all([
    getPlanOrNull(planId),
    getPlanCounts(planId),
    // Owner-only clinical narrative, now in plan_private_notes (decision D1).
    getPlanPrivateNotes(supabase, planId),
  ]);
  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={plan.title}
        description={<span className="sd-numeral">{plan.slug}</span>}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Plan', href: '/admin/plan' }, { label: plan.title }]}
      />

      {/* Structure navigation */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s, i) => (
          <Link key={s.key} href={`/admin/plan/${planId}/${s.key}`} className="sd-enter block" style={staggerStyle(i)}>
            <Panel interactive className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-sd-ink">{s.label}</span>
                  <span className="sd-numeral text-xs text-sd-ink-faint">{counts[s.key]}</span>
                </div>
                <p className="mt-0.5 text-xs text-sd-ink-faint">{s.desc}</p>
              </div>
              <ChevronRightGlyph className="shrink-0 text-sd-ink-faint" />
            </Panel>
          </Link>
        ))}
      </div>

      {/* Plan metadata editor */}
      <h2 className="sd-stat-label mb-3 mt-8">Plan details</h2>
      <Panel className="p-5">
        <EntityForm action={updatePlan.bind(null, planId)} submitLabel="Save plan">
          <Fieldset legend="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="title">
                <Input id="title" name="title" defaultValue={plan.title} required />
              </Field>
              <Field label="Slug" htmlFor="slug" hint="lowercase-hyphenated">
                <Input id="slug" name="slug" defaultValue={plan.slug} required />
              </Field>
              <Field label="Version" htmlFor="version">
                <Input id="version" name="version" type="number" min={1} defaultValue={plan.version} />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={plan.status}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
              <Field label="Prepared on" htmlFor="prepared_on">
                <Input id="prepared_on" name="prepared_on" type="date" defaultValue={plan.prepared_on ?? ''} />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Athlete">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="athlete_name">
                <Input id="athlete_name" name="athlete_name" defaultValue={plan.athlete_name ?? ''} />
              </Field>
              <Field label="Age" htmlFor="athlete_age">
                <Input id="athlete_age" name="athlete_age" type="number" defaultValue={plan.athlete_age ?? ''} />
              </Field>
            </div>
            <Field label="Athlete notes" htmlFor="athlete_notes" className="mt-4">
              <Textarea id="athlete_notes" name="athlete_notes" defaultValue={privateNotes?.athlete_notes ?? ''} />
            </Field>
          </Fieldset>

          <Fieldset legend="Race">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Race name" htmlFor="race_name">
                <Input id="race_name" name="race_name" defaultValue={plan.race_name ?? ''} />
              </Field>
              <Field label="Distance (km)" htmlFor="race_distance_km">
                <Input id="race_distance_km" name="race_distance_km" type="number" step="0.01" defaultValue={plan.race_distance_km ?? ''} />
              </Field>
              <Field label="Race date" htmlFor="race_date">
                <Input id="race_date" name="race_date" type="date" defaultValue={plan.race_date ?? ''} />
              </Field>
              <Field label="Start time" htmlFor="race_start_time">
                <Input id="race_start_time" name="race_start_time" type="time" defaultValue={plan.race_start_time ?? ''} />
              </Field>
              <Field label="Location" htmlFor="race_location">
                <Input id="race_location" name="race_location" defaultValue={plan.race_location ?? ''} />
              </Field>
            </div>
            <Field label="Course notes" htmlFor="race_course_notes" className="mt-4">
              <Textarea id="race_course_notes" name="race_course_notes" defaultValue={plan.race_course_notes ?? ''} />
            </Field>
          </Fieldset>

          <Fieldset legend="Span and narrative">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Start date" htmlFor="start_date">
                <Input id="start_date" name="start_date" type="date" defaultValue={plan.start_date ?? ''} />
              </Field>
              <Field label="End date" htmlFor="end_date">
                <Input id="end_date" name="end_date" type="date" defaultValue={plan.end_date ?? ''} />
              </Field>
              <Field label="Total planned (km)" htmlFor="total_planned_km">
                <Input id="total_planned_km" name="total_planned_km" type="number" step="0.01" defaultValue={plan.total_planned_km ?? ''} />
              </Field>
            </div>
            <Field label="North star" htmlFor="north_star" className="mt-4">
              <Textarea id="north_star" name="north_star" defaultValue={plan.north_star ?? ''} />
            </Field>
            <Field label="Plan logic" htmlFor="plan_logic" className="mt-4">
              <Textarea id="plan_logic" name="plan_logic" defaultValue={plan.plan_logic ?? ''} />
            </Field>
            <Field label="Medical notes" htmlFor="medical_notes" className="mt-4">
              <Textarea id="medical_notes" name="medical_notes" defaultValue={privateNotes?.medical_notes ?? ''} />
            </Field>
          </Fieldset>

          <Fieldset legend="Goals">
            <div className="grid gap-4">
              <Field label="Goal A" htmlFor="goal_a">
                <Input id="goal_a" name="goal_a" defaultValue={plan.goal_a ?? ''} />
              </Field>
              <Field label="Goal B" htmlFor="goal_b">
                <Input id="goal_b" name="goal_b" defaultValue={plan.goal_b ?? ''} />
              </Field>
              <Field label="Goal C" htmlFor="goal_c">
                <Input id="goal_c" name="goal_c" defaultValue={plan.goal_c ?? ''} />
              </Field>
            </div>
          </Fieldset>
        </EntityForm>
      </Panel>

      {/* Danger zone */}
      <h2 className="sd-stat-label mb-3 mt-8">Danger zone</h2>
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-sd-ink-dull">
          Deleting a plan removes all of its phases, weeks, days, sessions, alternatives, milestones,
          and checkpoints. This cannot be undone.
        </p>
        <DeleteButton
          action={deletePlan.bind(null, planId)}
          label="Delete plan"
          confirm={`Delete "${plan.title}" and everything under it? This cannot be undone.`}
        />
      </Panel>
    </div>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6 border-t border-sd-divider pt-5 first:border-t-0 first:pt-0">
      <legend className="sd-stat-label mb-3">{legend}</legend>
      {children}
    </fieldset>
  );
}
