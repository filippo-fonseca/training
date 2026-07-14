import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth/owner';
import type { DaySession, PlanWeek, SessionSlot } from '@/lib/types/database';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { Collapse } from '@/components/admin/collapse';
import { CrudRow } from '@/components/admin/crud-row';
import { EntityForm } from '@/components/admin/entity-form';
import { DeleteButton } from '@/components/admin/delete-button';
import { Field, Input, Textarea, Select, Checkbox } from '@/components/admin/field';
import { PlusGlyph } from '@/components/admin/icons';
import { getPlanOrNull, getDayEditorData } from '@/app/admin/_lib/queries';
import { formatDate } from '@/app/admin/_lib/format';
import {
  updateDay,
  deleteDay,
  upsertSession,
  deleteSession,
  upsertAlternative,
  deleteAlternative,
} from '@/app/admin/plan/actions';
import { staggerStyle } from '@/lib/design/motion';

const CATEGORIES = [
  ['easy_run', 'Easy run'],
  ['long_run', 'Long run'],
  ['quality_run', 'Quality run'],
  ['bike', 'Bike'],
  ['strength_only', 'Strength only'],
  ['rest', 'Rest'],
  ['race', 'Race'],
] as const;

const GATES = [
  ['green', 'Green'],
  ['yellow', 'Yellow'],
  ['red', 'Red'],
] as const;

export default async function DayEditorPage({
  params,
}: {
  params: Promise<{ planId: string; dayId: string }>;
}) {
  const { planId, dayId } = await params;
  await requireOwner();
  const [plan, data] = await Promise.all([getPlanOrNull(planId), getDayEditorData(planId, dayId)]);
  if (!plan || !data) notFound();
  const { day, sessions, alternatives, weeks } = data;

  const primary = sessions.find((s) => s.slot === 'primary');
  const secondary = sessions.find((s) => s.slot === 'secondary');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Day ${day.day_index} · ${formatDate(day.date)}`}
        description={day.weekday ?? undefined}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Plan', href: '/admin/plan' },
          { label: plan.title, href: `/admin/plan/${planId}` },
          { label: 'Days', href: `/admin/plan/${planId}/days` },
          { label: `Day ${day.day_index}` },
        ]}
      />

      {/* Day meta */}
      <h2 className="sd-stat-label mb-3">Day</h2>
      <Panel className="p-5">
        <EntityForm action={updateDay.bind(null, planId, dayId)} submitLabel="Save day">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" defaultValue={day.date} required />
            </Field>
            <Field label="Day index" htmlFor="day_index">
              <Input id="day_index" name="day_index" type="number" defaultValue={day.day_index} required />
            </Field>
            <Field label="Weekday" htmlFor="weekday">
              <Input id="weekday" name="weekday" defaultValue={day.weekday ?? ''} />
            </Field>
            <Field label="Week" htmlFor="week_id">
              <Select id="week_id" name="week_id" defaultValue={day.week_id}>
                {weeks.map((w: PlanWeek) => (
                  <option key={w.id} value={w.id}>
                    Week {w.week_index}
                    {w.phase_label ? ` · ${w.phase_label}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Week number" htmlFor="week_number">
              <Input id="week_number" name="week_number" type="number" defaultValue={day.week_number ?? ''} />
            </Field>
            <Field label="Days to race" htmlFor="days_to_race">
              <Input id="days_to_race" name="days_to_race" type="number" defaultValue={day.days_to_race ?? ''} />
            </Field>
            <Field label="Phase label" htmlFor="phase_label">
              <Input id="phase_label" name="phase_label" defaultValue={day.phase_label ?? ''} />
            </Field>
            <Field label="Planned run km" htmlFor="planned_run_km">
              <Input id="planned_run_km" name="planned_run_km" type="number" step="0.01" defaultValue={day.planned_run_km} />
            </Field>
            <Field label="Cumulative km" htmlFor="cumulative_km">
              <Input id="cumulative_km" name="cumulative_km" type="number" step="0.01" defaultValue={day.cumulative_km ?? ''} />
            </Field>
          </div>
        </EntityForm>
      </Panel>

      {/* Sessions */}
      <h2 className="sd-stat-label mb-3 mt-8">Sessions</h2>
      <div className="grid gap-3">
        <SessionBlock
          label="Primary session"
          slot="primary"
          planId={planId}
          dayId={dayId}
          session={primary}
          defaultOpen
        />
        <SessionBlock
          label="Secondary training"
          slot="secondary"
          planId={planId}
          dayId={dayId}
          session={secondary}
          defaultOpen={false}
        />
      </div>

      {/* Alternatives */}
      <h2 className="sd-stat-label mb-3 mt-8">Symptom-gated alternatives</h2>
      <div className="grid gap-3">
        {alternatives.length === 0 ? (
          <p className="text-sm text-sd-ink-faint">
            None. Add green / yellow / red alternatives for symptom-gated days.
          </p>
        ) : (
          alternatives.map((alt, i) => (
            <div key={alt.id} className="sd-enter" style={staggerStyle(i)}>
              <CrudRow
                title={<span className="capitalize">{alt.gate} gate</span>}
                subtitle={alt.distance_km != null ? `${alt.distance_km} km` : undefined}
                deleteAction={deleteAlternative.bind(null, planId, alt.id)}
                deleteConfirm={`Delete the ${alt.gate} alternative?`}
              >
                <EntityForm action={upsertAlternative.bind(null, planId, dayId)} submitLabel="Save alternative">
                  <input type="hidden" name="id" value={alt.id} />
                  <AlternativeFields gate={alt.gate} prescription={alt.prescription} distanceKm={alt.distance_km} />
                </EntityForm>
              </CrudRow>
            </div>
          ))
        )}
        <Collapse
          tone="accent"
          summary={
            <span className="inline-flex items-center gap-2">
              <PlusGlyph width={14} height={14} /> Add alternative
            </span>
          }
        >
          <EntityForm action={upsertAlternative.bind(null, planId, dayId)} submitLabel="Add alternative">
            <AlternativeFields />
          </EntityForm>
        </Collapse>
      </div>

      {/* Danger zone */}
      <h2 className="sd-stat-label mb-3 mt-8">Danger zone</h2>
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-sd-ink-dull">
          Deleting this day removes its sessions and alternatives.
        </p>
        <DeleteButton
          action={deleteDay.bind(null, planId, dayId)}
          label="Delete day"
          confirm={`Delete day ${day.day_index} (${day.date}) and its sessions?`}
        />
      </Panel>
    </div>
  );
}

function SessionBlock({
  label,
  slot,
  planId,
  dayId,
  session,
  defaultOpen,
}: {
  label: string;
  slot: SessionSlot;
  planId: string;
  dayId: string;
  session?: DaySession;
  defaultOpen: boolean;
}) {
  return (
    <div className="sd-panel overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-sd-divider px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-sd-ink">{label}</div>
          <div className="truncate text-xs text-sd-ink-faint">
            {session ? session.title : 'Not set'}
          </div>
        </div>
        {session ? (
          <DeleteButton
            action={deleteSession.bind(null, planId, session.id)}
            confirm={`Delete the ${slot} session?`}
            compact
          />
        ) : null}
      </div>
      <details open={defaultOpen} className="group">
        <summary className="cursor-pointer list-none px-4 py-2 text-tiny font-semibold uppercase tracking-wider text-sd-ink-faint transition-colors hover:text-sd-ink-dull [&::-webkit-details-marker]:hidden">
          {session ? 'Edit session' : 'Add session'}
        </summary>
        <div className="px-4 pb-4 pt-1">
          <EntityForm
            action={upsertSession.bind(null, planId, dayId)}
            submitLabel={session ? 'Save session' : 'Add session'}
          >
            <SessionFields slot={slot} session={session} />
          </EntityForm>
        </div>
      </details>
    </div>
  );
}

function SessionFields({ slot, session }: { slot: SessionSlot; session?: DaySession }) {
  const uid = session?.id ?? `new-${slot}`;
  return (
    <>
      {session ? <input type="hidden" name="id" value={session.id} /> : null}
      <input type="hidden" name="slot" value={slot} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor={`title-${uid}`}>
          <Input id={`title-${uid}`} name="title" defaultValue={session?.title ?? ''} required />
        </Field>
        <Field label="Category" htmlFor={`cat-${uid}`}>
          <Select id={`cat-${uid}`} name="category" defaultValue={session?.category ?? ''}>
            <option value="">--</option>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4">
        <Checkbox name="is_quality" label="Quality session" defaultChecked={session?.is_quality ?? false} />
      </div>

      <Field label="Today's role" htmlFor={`role-${uid}`} className="mt-4">
        <Textarea id={`role-${uid}`} name="role" defaultValue={session?.role ?? ''} />
      </Field>
      <Field label="Prescription" htmlFor={`rx-${uid}`} hint="may embed green/yellow/red text" className="mt-4">
        <Textarea id={`rx-${uid}`} name="prescription_text" rows={4} defaultValue={session?.prescription_text ?? ''} />
      </Field>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Distance (km)" htmlFor={`dist-${uid}`}>
          <Input id={`dist-${uid}`} name="distance_km" type="number" step="0.01" defaultValue={session?.distance_km ?? ''} />
        </Field>
        <Field label="Duration text" htmlFor={`dt-${uid}`}>
          <Input id={`dt-${uid}`} name="duration_text" defaultValue={session?.duration_text ?? ''} placeholder="55-60 min" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Dur min" htmlFor={`dmn-${uid}`}>
            <Input id={`dmn-${uid}`} name="duration_min_minutes" type="number" defaultValue={session?.duration_min_minutes ?? ''} />
          </Field>
          <Field label="Dur max" htmlFor={`dmx-${uid}`}>
            <Input id={`dmx-${uid}`} name="duration_max_minutes" type="number" defaultValue={session?.duration_max_minutes ?? ''} />
          </Field>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Pace text" htmlFor={`pt-${uid}`}>
          <Input id={`pt-${uid}`} name="pace_text" defaultValue={session?.pace_text ?? ''} placeholder="5:05-5:40/km" />
        </Field>
        <Field label="Pace min (s/km)" htmlFor={`pmn-${uid}`}>
          <Input id={`pmn-${uid}`} name="pace_min_s_per_km" type="number" defaultValue={session?.pace_min_s_per_km ?? ''} />
        </Field>
        <Field label="Pace max (s/km)" htmlFor={`pmx-${uid}`}>
          <Input id={`pmx-${uid}`} name="pace_max_s_per_km" type="number" defaultValue={session?.pace_max_s_per_km ?? ''} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="RPE text" htmlFor={`rpe-${uid}`}>
          <Input id={`rpe-${uid}`} name="rpe_text" defaultValue={session?.rpe_text ?? ''} placeholder="2/10" />
        </Field>
        <Field label="HR guide" htmlFor={`hr-${uid}`}>
          <Input id={`hr-${uid}`} name="hr_text" defaultValue={session?.hr_text ?? ''} placeholder="135-158 bpm / n/a" />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Terrain" htmlFor={`ter-${uid}`}>
          <Input id={`ter-${uid}`} name="terrain" defaultValue={session?.terrain ?? ''} />
        </Field>
        <Field label="Form cue" htmlFor={`cue-${uid}`}>
          <Input id={`cue-${uid}`} name="cue" defaultValue={session?.cue ?? ''} />
        </Field>
        <Field label="Fuel" htmlFor={`fuel-${uid}`}>
          <Input id={`fuel-${uid}`} name="fuel" defaultValue={session?.fuel ?? ''} />
        </Field>
        <Field label="Shoes" htmlFor={`shoe-${uid}`}>
          <Input id={`shoe-${uid}`} name="shoes" defaultValue={session?.shoes ?? ''} />
        </Field>
      </div>

      <Field label="Completion (planned restatement)" htmlFor={`cp-${uid}`} className="mt-4">
        <Textarea id={`cp-${uid}`} name="completion_planned" defaultValue={session?.completion_planned ?? ''} />
      </Field>
    </>
  );
}

function AlternativeFields({
  gate,
  prescription,
  distanceKm,
}: {
  gate?: string;
  prescription?: string;
  distanceKm?: number | null;
}) {
  const uid = gate ?? 'new';
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gate" htmlFor={`gate-${uid}`}>
          <Select id={`gate-${uid}`} name="gate" defaultValue={gate ?? ''} required>
            <option value="" disabled>
              Choose a gate
            </option>
            {GATES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Distance (km)" htmlFor={`adist-${uid}`}>
          <Input id={`adist-${uid}`} name="distance_km" type="number" step="0.01" defaultValue={distanceKm ?? ''} />
        </Field>
      </div>
      <Field label="Prescription" htmlFor={`arx-${uid}`} className="mt-4">
        <Textarea id={`arx-${uid}`} name="prescription" defaultValue={prescription ?? ''} required />
      </Field>
    </>
  );
}
