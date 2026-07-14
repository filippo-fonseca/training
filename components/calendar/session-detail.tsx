import type { ReactNode } from 'react';
import { Panel } from '@/components/ui/panel';
import { cn } from '@/lib/design/cn';
import type { DaySession } from '@/lib/types/database';
import { categoryMeta, chip, accentChip } from './status';
import { formatKm } from './format';

interface SessionDetailProps {
  session: DaySession;
  /** 'primary' renders the full target grid; 'secondary' is a lighter card. */
  slot: 'primary' | 'secondary';
  /** Optional slotted alternatives block (green/yellow/red), primary only. */
  alternatives?: ReactNode;
}

/**
 * Full prescription for one session slot: role rationale, exact prescription,
 * the pace / RPE / HR / time target grid, and terrain / cue / fuel / shoes.
 * Empty fields render as "—" per the brief.
 */
export function SessionDetail({ session, slot, alternatives }: SessionDetailProps) {
  const cat = categoryMeta(session.category);
  const isRace = cat.accent === true;
  const isPrimary = slot === 'primary';

  return (
    <Panel padded className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="sd-stat-label">{isPrimary ? 'Primary session' : 'Secondary training'}</span>
          <h2 className="text-lg font-semibold leading-tight text-sd-ink">{session.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {session.category ? (
            isRace ? (
              <span
                className="inline-flex items-center rounded-sd-chrome border px-2 py-0.5 text-tiny font-semibold uppercase tracking-[0.1em]"
                style={accentChip}
              >
                {cat.label}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-sd-chrome border px-2 py-0.5 text-tiny text-sd-ink-dull"
                style={cat.hueVar ? chip(cat.hueVar) : undefined}
              >
                {cat.hueVar ? (
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: `var(${cat.hueVar})` }} />
                ) : null}
                {cat.label}
              </span>
            )
          ) : null}
          {session.distance_km != null ? (
            <span className="sd-numeral text-sm font-semibold text-sd-ink">
              {formatKm(session.distance_km)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Role rationale */}
      {session.role ? (
        <div className="flex flex-col gap-1.5">
          <span className="sd-stat-label">Today&apos;s role</span>
          <p className="text-sm leading-relaxed text-sd-ink-dull">{session.role}</p>
        </div>
      ) : null}

      {/* Exact prescription */}
      {session.prescription_text ? (
        <div className="flex flex-col gap-1.5">
          <span className="sd-stat-label">Prescription</span>
          <p className="text-sm leading-relaxed text-sd-ink">{session.prescription_text}</p>
        </div>
      ) : null}

      {alternatives}

      {/* Targets */}
      {isPrimary ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-sd-tile border border-sd-line bg-sd-dark-box/40 p-4 sm:grid-cols-4">
          <Target label="Pace" value={session.pace_text} />
          <Target label="RPE" value={session.rpe_text} />
          <Target label="Heart rate" value={session.hr_text} />
          <Target label="Time" value={session.duration_text} />
        </div>
      ) : session.rpe_text || session.duration_text ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-sd-tile border border-sd-line bg-sd-dark-box/40 p-4">
          <Target label="RPE" value={session.rpe_text} />
          <Target label="Time" value={session.duration_text} />
        </div>
      ) : null}

      {/* Context chips */}
      {isPrimary ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Meta label="Terrain" value={session.terrain} />
          <Meta label="Form cue" value={session.cue} />
          <Meta label="Fuel" value={session.fuel} />
          <Meta label="Shoes" value={session.shoes} />
        </div>
      ) : null}
    </Panel>
  );
}

function Target({ label, value }: { label: string; value: string | null }) {
  const empty = !value;
  return (
    <div className="flex flex-col gap-1">
      <span className="sd-stat-label">{label}</span>
      <span className={cn('sd-numeral text-sm font-medium leading-snug', empty ? 'text-sd-ink-faint' : 'text-sd-ink')}>
        {value || '—'}
      </span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  const empty = !value;
  return (
    <div className="flex flex-col gap-1">
      <span className="sd-stat-label">{label}</span>
      <span className={cn('text-sm leading-snug', empty ? 'text-sd-ink-faint' : 'text-sd-ink-dull')}>
        {value || '—'}
      </span>
    </div>
  );
}
