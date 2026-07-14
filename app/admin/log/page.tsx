import { requireOwner } from '@/lib/auth/owner';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { EntityForm } from '@/components/admin/entity-form';
import { EmptyState } from '@/components/admin/data-table';
import { DeleteButton } from '@/components/admin/delete-button';
import { SessionLogFields } from '@/components/logging/session-log-fields';
import { StravaLinkPicker } from '@/components/logging/strava-link-picker';
import { WeekNav } from '@/components/logging/week-nav';
import { todayInNewYork } from '@/components/calendar/date-utils';
import type { StravaActivity } from '@/lib/types/database';
import {
  getPlanForAdminSurfaces,
  resolveWeekIndex,
  getLogRowsForWeek,
  getStravaPickerData,
  type LogDayRow,
} from '@/app/admin/_lib/queries';
import { formatDate, formatKm } from '@/app/admin/_lib/format';
import { saveSessionLog, deleteSessionLog, saveActivityLinks } from '@/app/admin/log/actions';
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

  // Strava evidence picker data for the week's primary sessions.
  const sessionIds = rows.flatMap((r) => (r.primary ? [r.primary.id] : []));
  const { activities, linkedBySession } = await getStravaPickerData(sessionIds);

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
              <DayLogRow
                planId={plan.id}
                row={row}
                isToday={row.day.date === today}
                activities={activities}
                linkedIds={row.primary ? linkedBySession.get(row.primary.id) ?? EMPTY_SET : EMPTY_SET}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function DayLogRow({
  planId,
  row,
  isToday,
  activities,
  linkedIds,
}: {
  planId: string;
  row: LogDayRow;
  isToday: boolean;
  activities: StravaActivity[];
  linkedIds: ReadonlySet<string>;
}) {
  const { day, primary, log, alternatives } = row;
  const linkedCount = linkedIds.size;
  // Linked Strava evidence takes precedence over the manual log (lib/derive).
  const summary =
    linkedCount > 0
      ? `Done · ${linkedCount} linked`
      : !log
        ? 'Not logged'
        : !log.completed
          ? 'Skipped'
          : log.modified
            ? 'Modified'
            : 'Completed';

  return (
    <div className="sd-panel sd-card-hover overflow-hidden p-0">
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
          <span className="flex items-center gap-1.5 text-xs text-sd-ink-faint">
            {linkedCount > 0 ? (
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: 'var(--ink-sage)' }} />
            ) : null}
            {summary}
          </span>
          {log ? (
            <DeleteButton
              action={deleteSessionLog.bind(null, day.id)}
              confirm={`Delete the log for ${formatDate(day.date)}? This cannot be undone.`}
              compact
            />
          ) : null}
        </div>
      </div>

      {/* Strava evidence: link one or more synced activities to the primary session. */}
      {primary && activities.length > 0 ? (
        <details open={linkedCount > 0} className="group border-t border-sd-divider">
          <summary className="cursor-pointer list-none px-4 py-2 text-tiny font-semibold uppercase tracking-wider text-sd-ink-faint transition-colors hover:text-sd-ink-dull [&::-webkit-details-marker]:hidden">
            Strava evidence{linkedCount > 0 ? ` (${linkedCount} linked)` : ''}
          </summary>
          <div className="px-4 pb-4 pt-1">
            <EntityForm action={saveActivityLinks.bind(null, primary.id)} submitLabel="Save links">
              <StravaLinkPicker
                sessionId={primary.id}
                dayDate={day.date}
                activities={activities}
                linkedIds={linkedIds}
              />
            </EntityForm>
          </div>
        </details>
      ) : null}

      <details open={isToday || !!log} className="group border-t border-sd-divider">
        <summary className="flex list-none items-center gap-1.5 px-4 py-2 text-tiny font-semibold uppercase tracking-wider text-sd-ink-faint transition-colors hover:bg-sd-hover/50 hover:text-sd-ink-dull [&::-webkit-details-marker]:hidden">
          <ChevronRightGlyph
            width={12}
            height={12}
            className="shrink-0 transition-transform duration-150 group-open:rotate-90"
          />
          {log ? 'Edit log' : linkedCount > 0 ? 'Manual log (fallback)' : 'Log this day'}
        </summary>
        <div className="px-4 pb-4 pt-1">
          {linkedCount > 0 ? (
            <p className="mb-2 text-tiny text-sd-ink-faint">
              This session is verified by linked Strava activities; their cumulative
              distance and time are the actuals. A manual log is only a fallback and
              will not override the linked evidence.
            </p>
          ) : null}
          <EntityForm action={saveSessionLog.bind(null, planId, day.id)} submitLabel={log ? 'Save log' : 'Log day'}>
            <SessionLogFields log={log} alternatives={alternatives} uid={day.id} />
          </EntityForm>
        </div>
      </details>
    </div>
  );
}
