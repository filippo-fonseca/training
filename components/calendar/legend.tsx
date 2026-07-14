import { CATEGORY_META, STATUS_META, accentChip } from './status';
import type { SessionCategory } from '@/lib/types/database';

const CATEGORY_ORDER: SessionCategory[] = [
  'easy_run',
  'long_run',
  'quality_run',
  'bike',
  'strength_only',
  'rest',
  'race',
];

const STATUS_ORDER = ['logged', 'alternative-used', 'missed', 'planned'] as const;

/**
 * Compact legend for the two colour channels: session type (leading dots) and
 * status (functional green/amber/coral). Keeps the dense grid readable.
 */
export function CalendarLegend() {
  return (
    <div className="flex flex-col gap-2 rounded-sd-card border border-sd-line bg-sd-box/30 px-4 py-3 text-xs sm:flex-row sm:items-start sm:gap-8">
      <Group label="Type">
        {CATEGORY_ORDER.map((c) => {
          const meta = CATEGORY_META[c];
          return (
            <span key={c} className="inline-flex items-center gap-1.5 text-sd-ink-dull">
              {meta.accent ? (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: 'var(--sd-accent)' }}
                />
              ) : (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: meta.hueVar ? `var(${meta.hueVar})` : 'var(--sd-ink-faint)' }}
                />
              )}
              {meta.label}
            </span>
          );
        })}
      </Group>
      <Group label="Status">
        {STATUS_ORDER.map((s) => {
          const meta = STATUS_META[s];
          return (
            <span key={s} className="inline-flex items-center gap-1.5 text-sd-ink-dull">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: meta.hueVar ? `var(${meta.hueVar})` : 'var(--sd-ink-faint)' }}
              />
              {meta.label}
            </span>
          );
        })}
        <span
          className="inline-flex items-center gap-1 rounded-sd-chrome border px-1.5 text-[10px] font-medium uppercase tracking-wide"
          style={accentChip}
        >
          <span aria-hidden className="size-1.5 rotate-45 rounded-[1px] bg-sd-accent" />
          Milestone
        </span>
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="sd-stat-label">{label}</span>
      {children}
    </div>
  );
}
