import type { DayAlternative, AlternativeGate } from '@/lib/types/database';
import { gateHue, chip } from './status';
import { formatKm } from './format';

const GATE_ORDER: Record<AlternativeGate, number> = { green: 0, yellow: 1, red: 2 };
const GATE_LABEL: Record<AlternativeGate, string> = {
  green: 'Green',
  yellow: 'Yellow',
  red: 'Red',
};

/**
 * Symptom-gated alternatives (green / yellow / red). These make a session's
 * conditionality explicit: reducing or skipping on symptoms is success, not
 * failure. Each gate is a 15%-alpha functional chip with its distance.
 */
export function Alternatives({ alternatives }: { alternatives: DayAlternative[] }) {
  if (alternatives.length === 0) return null;
  const sorted = [...alternatives].sort((a, b) => GATE_ORDER[a.gate] - GATE_ORDER[b.gate]);

  return (
    <div className="flex flex-col gap-2">
      <span className="sd-stat-label">Symptom-gated alternatives</span>
      <div className="grid gap-2 sm:grid-cols-3">
        {sorted.map((alt) => {
          const hue = gateHue(alt.gate);
          return (
            <div
              key={alt.id}
              className="flex flex-col gap-1.5 rounded-sd-tile border p-3"
              style={chip(hue)}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sd-ink">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: `var(${hue})` }} />
                  {GATE_LABEL[alt.gate]}
                </span>
                {alt.distance_km != null ? (
                  <span className="sd-numeral text-xs text-sd-ink-dull">{formatKm(alt.distance_km)}</span>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-sd-ink-dull">{alt.prescription}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
