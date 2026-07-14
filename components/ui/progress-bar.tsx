import { cn } from "@/lib/design/cn";

/**
 * ProgressBar — 6px track (--sd-input), accent fill, full radius (brief §7).
 * An optional projected/secondary segment renders as a 45-degree accent hatch
 * (`.sd-hatch`), for "planned but not yet done" ranges. Values clamp to 0-100.
 */
export interface ProgressBarProps {
  /** Completed portion, 0-100. */
  value: number;
  /** Projected portion beyond `value`, 0-100, drawn as an accent hatch. */
  projected?: number;
  /** Optional label row: dull text left, ink value right. */
  label?: string;
  valueLabel?: string;
  className?: string;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

export function ProgressBar({
  value,
  projected,
  label,
  valueLabel,
  className,
}: ProgressBarProps) {
  const fill = clamp(value);
  const proj = projected != null ? clamp(projected) : 0;
  // The hatch sits beyond the solid fill, capped at the remaining track.
  const hatch = Math.max(0, Math.min(proj, 100 - fill));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || valueLabel) && (
        <div className="flex items-baseline justify-between">
          {label ? (
            <span className="text-sm text-sd-ink-dull">{label}</span>
          ) : (
            <span />
          )}
          {valueLabel ? (
            <span className="sd-numeral text-sm text-sd-ink">{valueLabel}</span>
          ) : null}
        </div>
      )}
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-sd-input"
        role="progressbar"
        aria-valuenow={Math.round(fill)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {hatch > 0 && (
          <div
            className="sd-hatch absolute inset-y-0 rounded-full"
            style={{ left: `${fill}%`, width: `${hatch}%` }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-sd-accent"
          style={{
            width: `${fill}%`,
            boxShadow: "0 0 12px color-mix(in srgb, var(--sd-accent) 45%, transparent)",
          }}
        />
      </div>
    </div>
  );
}
