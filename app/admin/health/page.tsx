import { requireOwner } from '@/lib/auth/owner';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { EntityForm } from '@/components/admin/entity-form';
import { EmptyState } from '@/components/admin/data-table';
import { DeleteButton } from '@/components/admin/delete-button';
import { HealthEntryFields } from '@/components/logging/health-entry-fields';
import { WeekNav } from '@/components/logging/week-nav';
import { todayInNewYork } from '@/components/calendar/date-utils';
import {
  getPlanForAdminSurfaces,
  resolveWeekIndex,
  getHealthRowsForWeek,
  type HealthDayRow,
} from '@/app/admin/_lib/queries';
import { formatDate } from '@/app/admin/_lib/format';
import { saveHealthEntry, deleteHealthEntryAction } from '@/app/admin/health/actions';
import { ChevronRightGlyph } from '@/components/admin/icons';
import { staggerStyle } from '@/lib/design/motion';

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function HealthPage({ searchParams }: PageProps) {
  const { week } = await searchParams;
  await requireOwner();

  const plan = await getPlanForAdminSurfaces();
  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Health"
          description="Private injury checkpoint and recovery tracking."
          crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Health' }]}
        />
        <Panel className="p-5">
          <p className="text-sm text-sd-ink-dull">No active plan found. Import a plan first.</p>
        </Panel>
      </div>
    );
  }

  const requested = week ? Number.parseInt(week, 10) : NaN;
  const { weeks, weekIndex, week: activeWeek } = await resolveWeekIndex(
    plan.id,
    Number.isFinite(requested) ? requested : null,
  );
  const rows = await getHealthRowsForWeek(plan.id, weekIndex);
  const today = todayInNewYork();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Health"
        description="Injury checkpoint and recovery tracking, mirroring the plan's daily forms. Owner-only — never shown publicly."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Health' }]}
      />

      <WeekNav
        basePath="/admin/health"
        weekIndex={weekIndex}
        weekCount={weeks.length || weekIndex}
        phaseLabel={activeWeek?.phase_label ?? null}
      />

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No days in this week" description="This plan week has no days yet." />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.map((row, i) => (
            <div key={row.day.id} className="sd-enter" style={staggerStyle(i)}>
              <DayHealthRow planId={plan.id} row={row} isToday={row.day.date === today} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DayHealthRow({ planId, row, isToday }: { planId: string; row: HealthDayRow; isToday: boolean }) {
  const { day, entry } = row;

  return (
    <div className="sd-panel sd-soft-hover overflow-hidden p-0 hover:border-sd-selected">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-sd-ink">
            <span>
              {day.weekday ? `${day.weekday}, ` : ''}
              {formatDate(day.date)}
            </span>
            {isToday ? <span className="sd-stat-label text-sd-accent-faint">Today</span> : null}
          </div>
          <div className="truncate text-xs text-sd-ink-faint">{entry ? 'Checkpoint recorded' : 'Not recorded'}</div>
        </div>
        {entry ? (
          <div className="flex shrink-0 items-center gap-2">
            <DeleteButton
              action={deleteHealthEntryAction.bind(null, day.id)}
              confirm={`Delete the health checkpoint for ${formatDate(day.date)}? This cannot be undone.`}
              compact
            />
          </div>
        ) : null}
      </div>
      <details open={isToday || !!entry} className="group border-t border-sd-divider">
        <summary className="flex list-none items-center gap-1.5 px-4 py-2 text-tiny font-semibold uppercase tracking-wider text-sd-ink-faint transition-colors hover:bg-sd-hover/50 hover:text-sd-ink-dull [&::-webkit-details-marker]:hidden">
          <ChevronRightGlyph
            width={12}
            height={12}
            className="shrink-0 transition-transform duration-150 group-open:rotate-90"
          />
          {entry ? 'Edit checkpoint' : 'Add checkpoint'}
        </summary>
        <div className="px-4 pb-4 pt-1">
          <EntityForm
            action={saveHealthEntry.bind(null, planId, day.id, day.date)}
            submitLabel={entry ? 'Save checkpoint' : 'Save checkpoint'}
          >
            <HealthEntryFields entry={entry} uid={day.id} />
          </EntityForm>
        </div>
      </details>
    </div>
  );
}
