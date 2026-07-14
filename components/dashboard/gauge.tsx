/**
 * A hand-built 270-degree radial arc gauge (no chart library). Renders a dull
 * track, an optional target-range band in accent-faint, and a solid accent fill
 * for the logged value. Pure SVG so it works in server or client trees.
 */
interface GaugeProps {
  value: number;
  max: number;
  rangeMin?: number | null;
  rangeMax?: number | null;
  /** Diameter in px for the rendered box; the SVG scales to it. */
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

const R = 42;
const CX = 50;
const CY = 50;
const C = 2 * Math.PI * R;
const SWEEP = 0.75; // 270 degrees
const ARC = C * SWEEP;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function Gauge({
  value,
  max,
  rangeMin,
  rangeMax,
  size = 132,
  strokeWidth = 9,
  className,
  children,
}: GaugeProps) {
  const safeMax = Math.max(max, value, 1);
  const valueFrac = clamp01(value / safeMax);
  const bandStart = rangeMin != null ? clamp01(rangeMin / safeMax) : null;
  const bandEnd = rangeMax != null ? clamp01(rangeMax / safeMax) : null;

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: "relative" }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        {/* Rotate so the 90deg gap sits centered at the bottom. */}
        <g transform={`rotate(135 ${CX} ${CY})`}>
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--sd-darker-box)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${ARC} ${C}`}
          />
          {/* Target-range band */}
          {bandStart != null && bandEnd != null && bandEnd > bandStart ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="var(--sd-accent-deep)"
              strokeWidth={strokeWidth}
              strokeOpacity={0.45}
              strokeLinecap="butt"
              strokeDasharray={`0 ${bandStart * ARC} ${(bandEnd - bandStart) * ARC} ${C}`}
            />
          ) : null}
          {/* Value fill */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--sd-accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${valueFrac * ARC} ${C}`}
          />
        </g>
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
