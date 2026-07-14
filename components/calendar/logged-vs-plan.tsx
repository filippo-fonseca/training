import { Panel } from '@/components/ui/panel';
import { cn } from '@/lib/design/cn';
import type { DaySession, SessionLog } from '@/lib/types/database';
import { gateHue } from './status';
import { formatKm } from './format';

interface LoggedVsPlanProps {
  log: SessionLog;
  primary: DaySession | null;
  plannedKm: number | null;
}

/**
 * The logged result vs the plan, shown only when a session_log exists. Each row
 * pairs the planned target with the recorded actual; the traffic light and
 * "modified" flag make a deliberately reduced session read as success.
 */
export function LoggedVsPlan({ log, primary, plannedKm }: LoggedVsPlanProps) {
  const tl = log.traffic_light;
  return (
    <Panel padded className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="sd-stat-label">Logged result vs plan</span>
        <div className="flex items-center gap-2">
          {tl ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-sd-ink-dull">
              <span aria-hidden className="size-2 rounded-full" style={{ background: `var(${gateHue(tl)})` }} />
              <span className="capitalize">{tl}</span>
            </span>
          ) : null}
          <StatusFlag completed={log.completed} modified={log.modified} />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-sm">
        <span className="sd-stat-label self-end pb-1">Metric</span>
        <span className="sd-stat-label self-end pb-1">Planned</span>
        <span className="sd-stat-label self-end pb-1">Actual</span>

        <CompareRow
          label="Distance"
          planned={plannedKm != null && plannedKm > 0 ? formatKm(plannedKm) : '--'}
          actual={log.actual_distance_km != null ? formatKm(log.actual_distance_km) : '--'}
        />
        <CompareRow label="Pace" planned={primary?.pace_text ?? '--'} actual={log.actual_pace_text ?? '--'} />
        <CompareRow
          label="RPE"
          planned={primary?.rpe_text ?? '--'}
          actual={log.actual_rpe != null ? `${log.actual_rpe}/10` : '--'}
        />
        {log.actual_duration_min != null ? (
          <CompareRow label="Duration" planned={primary?.duration_text ?? '--'} actual={`${log.actual_duration_min} min`} />
        ) : null}
      </div>

      {log.shoe_used ? (
        <p className="text-xs text-sd-ink-dull">
          <span className="text-sd-ink-faint">Shoe used: </span>
          {log.shoe_used}
        </p>
      ) : null}
      {log.why_modified ? (
        <p className="text-xs leading-relaxed text-sd-ink-dull">
          <span className="text-sd-ink-faint">Why modified: </span>
          {log.why_modified}
        </p>
      ) : null}
      {log.notes ? (
        <p className="text-sm leading-relaxed text-sd-ink-dull">{log.notes}</p>
      ) : null}
    </Panel>
  );
}

function CompareRow({ label, planned, actual }: { label: string; planned: string; actual: string }) {
  return (
    <>
      <span className="text-sd-ink-faint">{label}</span>
      <span className="sd-numeral text-sd-ink-dull">{planned}</span>
      <span className={cn('sd-numeral font-medium', actual === '--' ? 'text-sd-ink-faint' : 'text-sd-ink')}>
        {actual}
      </span>
    </>
  );
}

function StatusFlag({ completed, modified }: { completed: boolean; modified: boolean }) {
  const label = !completed ? 'Not completed' : modified ? 'Modified' : 'Completed';
  const hue = !completed ? '--ink-coral' : modified ? '--ink-amber' : '--ink-sage';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-sd-ink-dull">
      <span aria-hidden className="size-2 rounded-full" style={{ background: `var(${hue})` }} />
      {label}
    </span>
  );
}
