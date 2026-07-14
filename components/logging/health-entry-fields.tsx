import { Field, Input, Textarea, Select, Checkbox } from '@/components/admin/field';
import type { HealthEntry } from '@/lib/types/database';

/**
 * Injury checkpoint + recovery tracking fields (health_entries), mirroring the
 * plan's fixed daily forms (data/baystate-2026/plan-full.md, "Daily page form
 * schema") field-for-field as structured inputs rather than a text blob.
 * PRIVATE table: this form is only ever mounted on /admin/health.
 */
const GATES = [
  ['', '—'],
  ['green', 'Green'],
  ['yellow', 'Yellow'],
  ['red', 'Red'],
] as const;

const FOOT_STATUS = [
  ['', '—'],
  ['baseline', 'Baseline'],
  ['changed', 'Changed'],
] as const;

export interface HealthEntryFieldsProps {
  entry?: HealthEntry | null;
  uid: string;
}

export function HealthEntryFields({ entry, uid }: HealthEntryFieldsProps) {
  return (
    <>
      <h3 className="sd-stat-label mb-3">Injury checkpoint</h3>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Knee before (0-10)" htmlFor={`kb-${uid}`}>
          <Input id={`kb-${uid}`} name="knee_before" type="number" min={0} max={10} defaultValue={entry?.knee_before ?? ''} />
        </Field>
        <Field label="Knee during (0-10)" htmlFor={`kd-${uid}`}>
          <Input id={`kd-${uid}`} name="knee_during" type="number" min={0} max={10} defaultValue={entry?.knee_during ?? ''} />
        </Field>
        <Field label="Knee after (0-10)" htmlFor={`ka-${uid}`}>
          <Input id={`ka-${uid}`} name="knee_after" type="number" min={0} max={10} defaultValue={entry?.knee_after ?? ''} />
        </Field>
        <Field label="Knee next morning (0-10)" htmlFor={`kn-${uid}`}>
          <Input id={`kn-${uid}`} name="knee_next_morning" type="number" min={0} max={10} defaultValue={entry?.knee_next_morning ?? ''} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Right foot" htmlFor={`fs-${uid}`}>
          <Select id={`fs-${uid}`} name="foot_status" defaultValue={entry?.foot_status ?? ''}>
            {FOOT_STATUS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Right calf (0-10)" htmlFor={`cs-${uid}`}>
          <Input id={`cs-${uid}`} name="calf_score" type="number" min={0} max={10} defaultValue={entry?.calf_score ?? ''} />
        </Field>
        <Field label="Traffic light" htmlFor={`itl-${uid}`}>
          <Select id={`itl-${uid}`} name="traffic_light" defaultValue={entry?.traffic_light ?? ''}>
            {GATES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-5">
        <Checkbox id={`gait-${uid}`} name="gait_normal" label="Gait normal" defaultChecked={entry?.gait_normal ?? false} />
        <Checkbox id={`stairs-${uid}`} name="stairs_normal" label="Stairs normal" defaultChecked={entry?.stairs_normal ?? false} />
      </div>

      <Field label="Pain quality / location" htmlFor={`pq-${uid}`} className="mt-4">
        <Textarea id={`pq-${uid}`} name="pain_quality" defaultValue={entry?.pain_quality ?? ''} />
      </Field>
      <Field label="Modification" htmlFor={`mod-${uid}`} className="mt-4">
        <Textarea id={`mod-${uid}`} name="modification" defaultValue={entry?.modification ?? ''} />
      </Field>

      <h3 className="sd-stat-label mb-3 mt-6">Recovery tracking</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Sleep (hours)" htmlFor={`sh-${uid}`}>
          <Input id={`sh-${uid}`} name="sleep_hours" type="number" step="0.1" min={0} defaultValue={entry?.sleep_hours ?? ''} />
        </Field>
        <Field label="Sleep quality" htmlFor={`sq-${uid}`}>
          <Input id={`sq-${uid}`} name="sleep_quality" defaultValue={entry?.sleep_quality ?? ''} />
        </Field>
        <Field label="Resting HR" htmlFor={`rhr-${uid}`}>
          <Input id={`rhr-${uid}`} name="resting_hr" type="number" min={0} defaultValue={entry?.resting_hr ?? ''} />
        </Field>
        <Field label="HRV" htmlFor={`hrv-${uid}`}>
          <Input id={`hrv-${uid}`} name="hrv" type="number" min={0} defaultValue={entry?.hrv ?? ''} />
        </Field>
        <Field label="Garmin readiness" htmlFor={`gr-${uid}`}>
          <Input id={`gr-${uid}`} name="garmin_readiness" defaultValue={entry?.garmin_readiness ?? ''} />
        </Field>
        <Field label="Energy" htmlFor={`en-${uid}`}>
          <Input id={`en-${uid}`} name="energy" defaultValue={entry?.energy ?? ''} />
        </Field>
        <Field label="Stress" htmlFor={`st-${uid}`}>
          <Input id={`st-${uid}`} name="stress" defaultValue={entry?.stress ?? ''} />
        </Field>
        <Field label="Body mass (optional)" htmlFor={`bm-${uid}`}>
          <Input id={`bm-${uid}`} name="body_mass" type="number" step="0.1" min={0} defaultValue={entry?.body_mass ?? ''} />
        </Field>
        <Field label="Soreness (0-10)" htmlFor={`sor-${uid}`}>
          <Input id={`sor-${uid}`} name="soreness" type="number" min={0} max={10} defaultValue={entry?.soreness ?? ''} />
        </Field>
      </div>
      <Field label="Hydration / appetite" htmlFor={`hy-${uid}`} className="mt-4">
        <Input id={`hy-${uid}`} name="hydration_appetite" defaultValue={entry?.hydration_appetite ?? ''} />
      </Field>
      <Field label="Notes" htmlFor={`notes-${uid}`} className="mt-4">
        <Textarea id={`notes-${uid}`} name="notes" defaultValue={entry?.notes ?? ''} />
      </Field>
    </>
  );
}
