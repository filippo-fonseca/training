import type { CumulativePoint } from "@/lib/db/progress";
import { linearScale, niceCeil, ticks, pointsAttr } from "./scale";
import { ChartFrame, LegendSwatch } from "./chart-frame";

/**
 * CumulativeKmChart — hand-built SVG line chart of running total km. The planned
 * curve is drawn as a dull reference line with a faint area under it; the
 * portion of that area past the last logged week is filled with the 45-degree
 * accent hatch (the projection idiom). The actual curve is a solid accent line
 * that stops at the last logged week rather than dropping to zero. When nothing
 * is logged yet, only the planned projection shows — a clean empty state.
 */

export interface CumulativeKmChartProps {
  points: CumulativePoint[];
  /** Total plan km, for the y-axis ceiling and the terminal label. */
  totalPlannedKm: number;
}

const W = 720;
const H = 280;
const PAD = { top: 16, right: 44, bottom: 40, left: 44 };
const PLOT = { x0: PAD.left, x1: W - PAD.right, y0: H - PAD.bottom, y1: PAD.top };

export function CumulativeKmChart({ points, totalPlannedKm }: CumulativeKmChartProps) {
  const yMax = niceCeil(Math.max(totalPlannedKm, 1));
  const n = Math.max(1, points.length);
  const x = linearScale([0, Math.max(1, n - 1)], [PLOT.x0, PLOT.x1]);
  const y = linearScale([0, yMax], [PLOT.y0, PLOT.y1]);
  const yTicks = ticks(yMax, 4);

  const plannedPairs: Array<[number, number]> = points.map((p, i) => [x(i), y(p.cumulativePlannedKm)]);
  const actualPairs: Array<[number, number | null]> = points.map((p, i) => [
    x(i),
    p.cumulativeActualKm != null ? y(p.cumulativeActualKm) : null,
  ]);

  // Last week that has an actual value; the projection region begins after it.
  const lastLoggedIdx = points.reduce(
    (acc, p, i) => (p.cumulativeActualKm != null ? i : acc),
    -1,
  );
  const anyLogged = lastLoggedIdx >= 0;

  // Planned area path (baseline -> planned curve -> back to baseline).
  const plannedArea =
    `M ${PLOT.x0} ${PLOT.y0} ` +
    plannedPairs.map(([px, py]) => `L ${round(px)} ${round(py)}`).join(" ") +
    ` L ${PLOT.x1} ${PLOT.y0} Z`;

  return (
    <ChartFrame
      label="Cumulative volume"
      caption="Running total km. The hatched region is planned but not yet run."
      titleId="cumulative-km"
      desc={`Line chart of cumulative running kilometres over ${n} weeks, ending at a planned total of ${totalPlannedKm} km.${
        anyLogged ? "" : " No sessions logged yet; only the planned projection is shown."
      }`}
      legend={
        <>
          <LegendSwatch variant="actual" label="Actual" />
          <LegendSwatch variant="projected" label="Planned" />
        </>
      }
      width={W}
      height={H}
    >
      <defs>
        <pattern
          id="cumulative-hatch"
          width="8"
          height="8"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="4" height="8" fill="color-mix(in srgb, var(--sd-accent) 22%, transparent)" />
        </pattern>
        {/* Clip the hatch to the region after the last logged week */}
        <clipPath id="cumulative-projection-clip">
          <rect
            x={anyLogged ? x(lastLoggedIdx) : PLOT.x0}
            y={PLOT.y1}
            width={(anyLogged ? PLOT.x1 - x(lastLoggedIdx) : PLOT.x1 - PLOT.x0)}
            height={PLOT.y0 - PLOT.y1}
          />
        </clipPath>
      </defs>

      {/* Y gridlines + ticks */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PLOT.x0}
            x2={PLOT.x1}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--sd-line)"
            strokeWidth={1}
            opacity={t === 0 ? 0.9 : 0.35}
          />
          <text x={PLOT.x0 - 8} y={y(t) + 3} textAnchor="end" className="chart-axis-label">
            {t}
          </text>
        </g>
      ))}

      {/* Planned area: faint fill everywhere, hatch over the not-yet-run region */}
      <path d={plannedArea} fill="color-mix(in srgb, var(--sd-box) 55%, transparent)" />
      <path
        d={plannedArea}
        fill="url(#cumulative-hatch)"
        clipPath="url(#cumulative-projection-clip)"
      />

      {/* Planned reference line (dashed; decorative dashes, no draw-on) */}
      <polyline
        points={pointsAttr(plannedPairs)}
        fill="none"
        stroke="var(--sd-ink-faint)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />

      {/* Actual accent line (stops at last logged week) */}
      {anyLogged && (
        <polyline
          points={pointsAttr(actualPairs)}
          fill="none"
          stroke="var(--sd-accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-line"
          pathLength={1}
          style={{ filter: "drop-shadow(0 0 6px var(--hud-cyan-glow))" }}
        />
      )}

      {/* Terminal planned total label */}
      <text
        x={PLOT.x1 + 4}
        y={y(totalPlannedKm) + 3}
        textAnchor="start"
        className="chart-axis-label"
      >
        {totalPlannedKm}
      </text>

      {/* X labels: a subset of week numbers to avoid crowding */}
      {points.map((p, i) =>
        i === 0 || i === n - 1 || (i + 1) % 3 === 0 ? (
          <text key={p.weekIndex} x={x(i)} y={PLOT.y0 + 16} textAnchor="middle" className="chart-axis-label">
            {p.weekIndex}
          </text>
        ) : null,
      )}

      {/* Baseline */}
      <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.y0} y2={PLOT.y0} stroke="var(--sd-line)" strokeWidth={1} />

      <style>{`
        .chart-axis-label { fill: var(--sd-ink-faint); font-size: 10px; font-family: var(--font-mono); }
        .chart-line { animation: chart-draw 900ms var(--ease-out-quart) forwards; }
        @keyframes chart-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .chart-line { animation: none !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </ChartFrame>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
