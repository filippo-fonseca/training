import { Field, Input, Textarea, Select } from '@/components/admin/field';
import type { DayAlternative, SessionLog } from '@/lib/types/database';

/**
 * The completion form's fields (session_logs). Status is presented as a single
 * three-way select but persists to the existing completed+modified booleans:
 * skipped -> completed:false, modified:false; completed -> completed:true,
 * modified:false; modified -> completed:true, modified:true.
 */
const STATUS_OPTIONS = [
  ['completed', 'Completed as planned'],
  ['modified', 'Modified'],
  ['skipped', 'Skipped'],
] as const;

function statusOf(log: SessionLog | null | undefined): (typeof STATUS_OPTIONS)[number][0] {
  if (!log) return 'completed';
  if (!log.completed) return 'skipped';
  return log.modified ? 'modified' : 'completed';
}

export interface SessionLogFieldsProps {
  log?: SessionLog | null;
  /** The day's green/yellow/red alternatives, if any, for the "which alternative" picker. */
  alternatives: DayAlternative[];
  /** Unique suffix for this row's field ids (the plan_day_id is a good choice). */
  uid: string;
}

export function SessionLogFields({ log, alternatives, uid }: SessionLogFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor={`status-${uid}`}>
          <Select id={`status-${uid}`} name="status" defaultValue={statusOf(log)}>
            {STATUS_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Alternative used" htmlFor={`tl-${uid}`} hint="if a green/yellow/red gate applied">
          <Select id={`tl-${uid}`} name="traffic_light" defaultValue={log?.traffic_light ?? ''}>
            <option value="">None — ran as planned</option>
            {alternatives.map((a) => (
              <option key={a.id} value={a.gate}>
                {a.gate.charAt(0).toUpperCase() + a.gate.slice(1)}
                {a.distance_km != null ? ` · ${a.distance_km} km` : ` · ${a.prescription.slice(0, 40)}`}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Distance (km)" htmlFor={`dist-${uid}`}>
          <Input
            id={`dist-${uid}`}
            name="actual_distance_km"
            type="number"
            step="0.01"
            min={0}
            defaultValue={log?.actual_distance_km ?? ''}
          />
        </Field>
        <Field label="Duration (min)" htmlFor={`dur-${uid}`}>
          <Input
            id={`dur-${uid}`}
            name="actual_duration_min"
            type="number"
            step="0.1"
            min={0}
            defaultValue={log?.actual_duration_min ?? ''}
          />
        </Field>
        <Field label="Pace" htmlFor={`pace-${uid}`} hint="blank = auto from distance/duration">
          <Input id={`pace-${uid}`} name="actual_pace_text" placeholder="5:20/km" defaultValue={log?.actual_pace_text ?? ''} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="RPE (1-10)" htmlFor={`rpe-${uid}`}>
          <Input id={`rpe-${uid}`} name="actual_rpe" type="number" min={1} max={10} defaultValue={log?.actual_rpe ?? ''} />
        </Field>
        <Field label="Avg HR (bpm)" htmlFor={`hr-${uid}`}>
          <Input id={`hr-${uid}`} name="actual_avg_hr" type="number" min={0} defaultValue={log?.actual_avg_hr ?? ''} />
        </Field>
        <Field label="Shoe used" htmlFor={`shoe-${uid}`}>
          <Input id={`shoe-${uid}`} name="shoe_used" defaultValue={log?.shoe_used ?? ''} />
        </Field>
      </div>

      <Field label="Why modified" htmlFor={`wm-${uid}`} className="mt-4">
        <Textarea id={`wm-${uid}`} name="why_modified" defaultValue={log?.why_modified ?? ''} />
      </Field>
      <Field label="Tomorrow change" htmlFor={`tc-${uid}`} className="mt-4">
        <Textarea id={`tc-${uid}`} name="tomorrow_change" defaultValue={log?.tomorrow_change ?? ''} />
      </Field>
      <Field label="Notes" htmlFor={`notes-${uid}`} className="mt-4">
        <Textarea id={`notes-${uid}`} name="notes" defaultValue={log?.notes ?? ''} />
      </Field>
    </>
  );
}
