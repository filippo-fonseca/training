import type { TypeBreakdown } from '@/lib/db/stats';
import { CATEGORY_META } from '@/components/calendar/status';

/**
 * Planned volume by session type. A compact meta-row list (brief §7 progress
 * row): a category dot + label on the left, the planned km value on the right,
 * and a 6px accent track showing each type's share of the largest. Colours are
 * tokens only; the functional category hue lives in the 6px dot, the bar fill is
 * the app accent (the sanctioned progress-fill idiom).
 */
export function TypeBreakdownList({ items }: { items: TypeBreakdown[] }) {
  const maxKm = Math.max(1, ...items.map((i) => i.plannedKm));

  if (items.length === 0) {
    return (
      <p className="text-sm text-sd-ink-faint">
        No session volume recorded for this plan yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Planned volume by session type">
      {items.map((item) => {
        const hueVar = CATEGORY_META[item.category]?.hueVar ?? null;
        const pct = Math.round((item.plannedKm / maxKm) * 100);
        return (
          <li key={item.category} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: hueVar ? `var(${hueVar})` : 'var(--sd-accent)' }}
                />
                <span className="text-sm text-sd-ink-dull">{item.label}</span>
              </span>
              <span className="sd-numeral text-sm font-medium text-sd-ink">
                {item.plannedKm}
                <span className="ml-0.5 text-xs font-normal text-sd-ink-faint">km</span>
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-sd-input"
              role="presentation"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'var(--sd-accent)' }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
