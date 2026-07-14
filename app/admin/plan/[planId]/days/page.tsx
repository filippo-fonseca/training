import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth/owner';
import type { PlanWeek } from '@/lib/types/database';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/data-table';
import { Panel } from '@/components/ui/panel';
import { Collapse } from '@/components/admin/collapse';
import { EntityForm } from '@/components/admin/entity-form';
import { Field, Input, Select } from '@/components/admin/field';
import { PlusGlyph, ChevronRightGlyph } from '@/components/admin/icons';
import { getPlanOrNull, getDaysOverview } from '@/app/admin/_lib/queries';
import { formatDate, formatKm } from '@/app/admin/_lib/format';
import { createDay } from '@/app/admin/plan/actions';

export default async function DaysPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await requireOwner();
  const plan = await getPlanOrNull(planId);
  if (!plan) notFound();
  const { weeks, days, primaryByDay } = await getDaysOverview(planId);

  const weeksById = new Map(weeks.map((w) => [w.id, w]));
  const byWeek = new Map<string, typeof days>();
  for (const d of days) {
    const list = byWeek.get(d.week_id) ?? [];
    list.push(d);
    byWeek.set(d.week_id, list);
  }
  // Preserve week order; days without a known week fall to the end.
  const orderedWeekIds = [
    ...weeks.filter((w) => byWeek.has(w.id)).map((w) => w.id),
    ...[...byWeek.keys()].filter((id) => !weeksById.has(id)),
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Days"
        description="Every day in the plan. Open a day to edit its sessions, targets, and gated alternatives."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Plan', href: '/admin/plan' },
          { label: plan.title, href: `/admin/plan/${planId}` },
          { label: 'Days' },
        ]}
      />

      {days.length === 0 ? (
        <EmptyState
          title="No days yet"
          description="Import a plan or add days below. Days must belong to a week, so create weeks first."
        />
      ) : (
        <div className="grid gap-5">
          {orderedWeekIds.map((weekId) => {
            const week = weeksById.get(weekId);
            const weekDays = byWeek.get(weekId) ?? [];
            return (
              <section key={weekId}>
                <h2 className="sd-stat-label mb-2">
                  {week ? `Week ${week.week_index}${week.phase_label ? ` · ${week.phase_label}` : ''}` : 'Unassigned'}
                </h2>
                <div className="grid gap-2">
                  {weekDays.map((d) => {
                    const primary = primaryByDay.get(d.id);
                    return (
                      <Link key={d.id} href={`/admin/plan/${planId}/days/${d.id}`}>
                        <Panel interactive className="flex items-center gap-3 p-3">
                          <span className="sd-numeral w-10 shrink-0 text-xs text-sd-ink-faint">
                            {d.day_index}/98
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-sd-ink">
                              {primary?.title ?? <span className="text-sd-ink-faint">No session</span>}
                            </div>
                            <div className="truncate text-xs text-sd-ink-faint">
                              {d.weekday ? `${d.weekday}, ` : ''}
                              {formatDate(d.date)}
                            </div>
                          </div>
                          <span className="sd-numeral shrink-0 text-xs text-sd-ink-dull">
                            {formatKm(primary?.distance_km ?? d.planned_run_km)}
                          </span>
                          <ChevronRightGlyph className="shrink-0 text-sd-ink-faint" />
                        </Panel>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {weeks.length > 0 ? (
        <div className="mt-6">
          <Collapse
            tone="accent"
            summary={
              <span className="inline-flex items-center gap-2">
                <PlusGlyph width={14} height={14} /> Add day
              </span>
            }
          >
            <EntityForm action={createDay.bind(null, planId)} submitLabel="Create day">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Week" htmlFor="new-week">
                  <Select id="new-week" name="week_id" required defaultValue="">
                    <option value="" disabled>
                      Choose a week
                    </option>
                    {weeks.map((w: PlanWeek) => (
                      <option key={w.id} value={w.id}>
                        Week {w.week_index}
                        {w.phase_label ? ` · ${w.phase_label}` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date" htmlFor="new-date">
                  <Input id="new-date" name="date" type="date" required />
                </Field>
                <Field label="Day index" htmlFor="new-di" hint="1..N, unique">
                  <Input id="new-di" name="day_index" type="number" required />
                </Field>
                <Field label="Weekday" htmlFor="new-wd">
                  <Input id="new-wd" name="weekday" placeholder="Mon" />
                </Field>
                <Field label="Planned run km" htmlFor="new-prk">
                  <Input id="new-prk" name="planned_run_km" type="number" step="0.01" defaultValue="0" />
                </Field>
                <Field label="Days to race" htmlFor="new-dtr">
                  <Input id="new-dtr" name="days_to_race" type="number" />
                </Field>
              </div>
            </EntityForm>
          </Collapse>
        </div>
      ) : null}
    </div>
  );
}
