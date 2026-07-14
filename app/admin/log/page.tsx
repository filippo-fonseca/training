import { requireOwner } from '@/lib/auth/owner';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { EntityForm } from '@/components/admin/entity-form';
import { EmptyState } from '@/components/admin/data-table';
import { DeleteButton } from '@/components/admin/delete-button';
import { SessionLogFields } from '@/components/logging/session-log-fields';
import { WeekNav } from '@/components/logging/week-nav';
import { todayInNewYork } from '@/components/calendar/date-utils';
import {
  getPlanForAdminSurfaces,
  resolveWeekIndex,
  getLogRowsForWeek,
  type LogDayRow,
} from '@/app/admin/_lib/queries';
import { formatDate, formatKm } from '@/app/admin/_lib/format';
import { saveSessionLog, deleteSessionLog } from '@/app/admin/log/actions';
import { ChevronRightGlyph } from '@/components/admin/icons';
import { staggerStyle } from '@/lib/design/motion';

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function LogPage({ searchParams }: PageProps) {
  const { week } = await searchParams;
  await requireOwner();

  const plan = await getPlanForAdminSurfaces();
  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Log" description="Record actual results per day." crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Log' }]} />
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
  const rows = await getLogRowsForWeek(plan.id, weekIndex);
  const today = todayInNewYork();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Log"
        description="Record actual results per day. Logging a day updates the public dashboard, calendar, day detail, and progress views."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Log' }]}
      />

      <WeekNav
        basePath="/admin/log"
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
              <DayLogRow planId={plan.id} row={row} isToday={row.day.date === today} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DayLogRow({ planId, row, isToday }: { planId: string; row: LogDayRow; isToday: boolean }) {
  const { day, primary, log, alternatives } = row;
  const summary = !log ? 'Not logged' : !log.completed ? 'Skipped' : log.modified ? 'Modified' : 'Completed';

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
          <div className="truncate text-xs text-sd-ink-faint">
            {primary?.title ?? 'No session'} · {formatKm(primary?.distance_km ?? day.planned_run_km)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-sd-ink-faint">{summary}</span>
          {log ? (
            <DeleteButton
              action={deleteSessionLog.bind(null, day.id)}
              confirm={`Delete the log for ${formatDate(day.date)}? This cannot be undone.`}
              compact
            />
          ) : null}
        </div>
      </div>
      <details open={isToday || !!log} className="group border-t border-sd-divider">
        <summary className="flex list-none items-center gap-1.5 px-4 py-2 text-tiny font-semibold uppercase tracking-wider text-sd-ink-faint transition-colors hover:bg-sd-hover/50 hover:text-sd-ink-dull [&::-webkit-details-marker]:hidden">
          <ChevronRightGlyph
            width={12}
            height={12}
            className="shrink-0 transition-transform duration-150 group-open:rotate-90"
          />
          {log ? 'Edit log' : 'Log this day'}
        </summary>
        <div className="px-4 pb-4 pt-1">
          <EntityForm action={saveSessionLog.bind(null, planId, day.id)} submitLabel={log ? 'Save log' : 'Log day'}>
            <SessionLogFields log={log} alternatives={alternatives} uid={day.id} />
          </EntityForm>
        </div>
      </details>
    </div>
  );
}
