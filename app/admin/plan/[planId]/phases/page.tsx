import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireOwner } from '@/lib/auth/owner';
import { getPhases, getWeeks } from '@/lib/db';
import { assignWeeksToPhases, overlappingPhaseIds } from '@/lib/derive';
import type { PlanPhase, PlanWeek } from '@/lib/types/database';
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

/** Shared field set for both the create and edit forms. Phases are date-ranged:
 *  the window sets which weeks match (by containment); no week-index inputs. */
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
        <Field label="Start date" htmlFor={`sd-${phase?.id ?? 'new'}`} hint="weeks match by date">
          <Input id={`sd-${phase?.id ?? 'new'}`} name="start_date" type="date" defaultValue={phase?.start_date ?? ''} />
        </Field>
        <Field label="End date" htmlFor={`ed-${phase?.id ?? 'new'}`}>
          <Input id={`ed-${phase?.id ?? 'new'}`} name="end_date" type="date" defaultValue={phase?.end_date ?? ''} />
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

/** A small amber warning chip (overlap / orphan). */
function WarnChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex w-fit items-center rounded-sd-chrome border px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-[0.06em]"
      style={{
        color: 'var(--ink-amber)',
        background: 'color-mix(in srgb, var(--ink-amber) 12%, transparent)',
        borderColor: 'color-mix(in srgb, var(--ink-amber) 35%, var(--sd-line))',
      }}
    >
      {children}
    </span>
  );
}

/** Read-only list of the weeks that auto-match a phase by date containment. */
function MatchedWeeks({ weeks }: { weeks: PlanWeek[] }) {
  if (weeks.length === 0) {
    return (
      <p className="mb-3 text-xs text-sd-ink-faint">
        No weeks match this window yet. Set a start and end date that spans the weeks you want; a week
        joins the phase when its start date falls inside the window.
      </p>
    );
  }
  return (
    <div className="mb-3">
      <p className="sd-stat-label mb-1.5">Auto-matched weeks (read-only)</p>
      <div className="flex flex-wrap gap-1.5">
        {weeks.map((w) => (
          <span
            key={w.id}
            className="inline-flex items-center rounded-sd-chrome border border-sd-line bg-sd-input px-1.5 py-[1px] text-[10px] text-sd-ink-dull"
            title={w.start_date ?? undefined}
          >
            Wk {w.week_index}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function PhasesPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await requireOwner();
  const plan = await getPlanOrNull(planId);
  if (!plan) notFound();
  const supabase = await createServerSupabaseClient();
  const [phases, weeks] = await Promise.all([getPhases(supabase, planId), getWeeks(supabase, planId)]);

  // Auto-matched weeks, orphans, and overlaps, all from the shared rule.
  const { byPhaseId, orphans } = assignWeeksToPhases(phases, weeks);
  const overlaps = overlappingPhaseIds(phases);

  function weekSpan(ws: PlanWeek[]): string {
    if (ws.length === 0) return 'matches no weeks';
    const lo = ws[0].week_index;
    const hi = ws[ws.length - 1].week_index;
    return lo === hi ? `week ${lo}` : `weeks ${lo}-${hi} (${ws.length})`;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Phases"
        description="Date-ranged training blocks. Weeks auto-match by date containment; set each phase's window and its weeks fill in."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Plan', href: '/admin/plan' },
          { label: plan.title, href: `/admin/plan/${planId}` },
          { label: 'Phases' },
        ]}
      />

      {orphans.length > 0 ? (
        <div
          className="mb-4 flex flex-wrap items-center gap-2 rounded-sd-chrome border px-3 py-2 text-xs"
          style={{
            background: 'color-mix(in srgb, var(--ink-amber) 10%, var(--sd-box))',
            borderColor: 'color-mix(in srgb, var(--ink-amber) 30%, var(--sd-line))',
          }}
        >
          <WarnChip>Orphan weeks</WarnChip>
          <span className="text-sd-ink-dull">
            {orphans.length} week{orphans.length === 1 ? '' : 's'} match no phase:{' '}
            {orphans.map((w) => `Wk ${w.week_index}`).join(', ')}. Widen a phase window to cover them.
          </span>
        </div>
      ) : null}

      <div className="grid gap-3">
        {phases.length === 0 ? (
          <EmptyState title="No phases yet" description="Add the first training block below." />
        ) : (
          phases.map((phase, i) => {
            const matched = byPhaseId.get(phase.id) ?? [];
            const dated = phase.start_date && phase.end_date;
            const overlapping = overlaps.has(phase.id);
            return (
              <div key={phase.id} className="sd-enter" style={staggerStyle(i)}>
                <CrudRow
                  title={`${phase.phase_index}. ${phase.name}`}
                  subtitle={
                    dated
                      ? `${phase.start_date} to ${phase.end_date} · ${weekSpan(matched)}`
                      : 'No date window set · matches no weeks'
                  }
                  badges={overlapping ? <WarnChip>Overlaps</WarnChip> : undefined}
                  deleteAction={deletePhase.bind(null, planId, phase.id)}
                  deleteConfirm={`Delete phase "${phase.name}"?`}
                >
                  <MatchedWeeks weeks={matched} />
                  <EntityForm action={upsertPhase.bind(null, planId)} submitLabel="Save phase">
                    <PhaseFields phase={phase} />
                  </EntityForm>
                </CrudRow>
              </div>
            );
          })
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
