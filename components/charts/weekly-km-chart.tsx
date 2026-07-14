import type { WeeklyKm } from "@/lib/db/progress";
import { linearScale, niceCeil, ticks } from "./scale";
import { ChartFrame, LegendSwatch } from "./chart-frame";

/**
 * WeeklyKmChart (hand-built SVG, no chart library). Per week: a recessed
 * planned-km track bar (the ceiling), with the logged actual km drawn as a
 * solid accent fill inside it. Weeks with no log yet render the planned bar as
 * the brief's 45-degree accent hatch, the "planned but not yet run"
 * projection idiom, so early empty weeks read as intentional, not as zeros.
 * Phase bands sit behind the columns, labeled along the baseline.
 *
 * Colors are tokens only. Bars grow from the baseline via a CSS transform
 * entrance that is disabled under prefers-reduced-motion (see globals.css /
 * the scoped <style> below), keeping the static fallback fully legible.
 */

interface PhaseBand {
  name: string;
  startWeek: number;
  endWeek: number;
}

export interface WeeklyKmChartProps {
  weekly: WeeklyKm[];
  phases?: PhaseBand[];
  /** 1-based week index considered "current"; marks the today column. */
  currentWeek?: number | null;
}

// viewBox geometry (abstract units; scales to container width via CSS).
const W = 720;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 52, left: 40 };
const PLOT = {
  x0: PAD.left,
  x1: W - PAD.right,
  y0: H - PAD.bottom,
  y1: PAD.top,
};

export function WeeklyKmChart({ weekly, phases = [], currentWeek }: WeeklyKmChartProps) {
  const maxPlanned = Math.max(1, ...weekly.map((w) => w.plannedKm));
  const yMax = niceCeil(maxPlanned);
  const y = linearScale([0, yMax], [PLOT.y0, PLOT.y1]);
  const yTicks = ticks(yMax, 4);

  const plotW = PLOT.x1 - PLOT.x0;
  const n = Math.max(1, weekly.length);
  const slot = plotW / n;
  const barW = Math.min(28, slot * 0.56);

  const colX = (i: number) => PLOT.x0 + slot * i + slot / 2;
  const anyLogged = weekly.some((w) => w.actualKm != null);

  return (
    <ChartFrame
      label="Weekly volume: planned vs actual"
      caption="Planned km is a ceiling, not a floor. Bars not yet run show as a hatched projection."
      titleId="weekly-km"
      desc={`Bar chart of weekly running volume across ${weekly.length} weeks. Planned kilometres per week: ${weekly
        .map((w) => `week ${w.weekIndex} ${w.plannedKm}`)
        .join(", ")}.${
        anyLogged
          ? ""
          : " No sessions have been logged yet, so all bars render as planned projections."
      }`}
      legend={
        <>
          <LegendSwatch variant="actual" label="Actual" />
          <LegendSwatch variant="projected" label="Planned (not yet run)" />
        </>
      }
      width={W}
      height={H}
    >
      <defs>
        {/* 45-degree accent hatch for the projected (not-yet-run) bars */}
        <pattern
          id="weekly-hatch"
          width="8"
          height="8"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="var(--sd-input)" />
          <rect
            width="4"
            height="8"
            fill="color-mix(in srgb, var(--sd-accent) 35%, transparent)"
          />
        </pattern>
      </defs>

      {/* Phase bands (behind everything). Each label is clipped to its own band
          rect, so at narrow container widths (many phases compressed into the
          same viewBox) a label can never bleed sideways into a neighboring
          band's space; the labelFits pre-check additionally skips rendering
          text for bands too narrow to hold it at all, rather than clipping it
          to an illegible sliver. The band boundary itself (the dashed divider)
          still reads fine on its own either way. */}
      {phases.map((p) => {
        const first = weekly.findIndex((w) => w.weekIndex === p.startWeek);
        const last = weekly.findIndex((w) => w.weekIndex === p.endWeek);
        if (first < 0 || last < 0) return null;
        const bx0 = PLOT.x0 + slot * first;
        const bx1 = PLOT.x0 + slot * (last + 1);
        const mid = (bx0 + bx1) / 2;
        const bandW = bx1 - bx0;
        // Rough monospace width at 9.5px: ~5.7 viewBox units per character.
        const labelW = p.name.length * 5.7;
        const labelFits = labelW <= bandW - 4;
        const clipId = `phase-clip-${p.startWeek}`;
        return (
          <g key={`${p.name}-${p.startWeek}`}>
            <rect
              x={bx0}
              y={PLOT.y1}
              width={bandW}
              height={PLOT.y0 - PLOT.y1}
              fill={first % 2 === 0 ? "color-mix(in srgb, var(--sd-box) 40%, transparent)" : "transparent"}
            />
            <line
              x1={bx0}
              x2={bx0}
              y1={PLOT.y1}
              y2={PLOT.y0}
              stroke="var(--sd-line)"
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.6}
            />
            {labelFits && (
              <>
                <clipPath id={clipId}>
                  <rect x={bx0} y={PLOT.y1} width={bandW} height={PLOT.y0 - PLOT.y1} />
                </clipPath>
                <text
                  x={mid}
                  y={H - 14}
                  textAnchor="middle"
                  clipPath={`url(#${clipId})`}
                  className="chart-phase-label"
                >
                  {p.name}
                </text>
              </>
            )}
          </g>
        );
      })}

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

      {/* Bars */}
      {weekly.map((w, i) => {
        const cx = colX(i);
        const bx = cx - barW / 2;
        const plannedTop = y(w.plannedKm);
        const plannedH = PLOT.y0 - plannedTop;
        const isProjection = w.actualKm == null;
        const isCurrent = currentWeek != null && w.weekIndex === currentWeek;
        const actualTop = isProjection ? plannedTop : y(w.actualKm ?? 0);
        const actualH = isProjection ? 0 : PLOT.y0 - actualTop;
        const delay = Math.min(i, 24) * 24;

        return (
          <g key={w.weekIndex} className="chart-col" style={{ ["--d" as string]: `${delay}ms` }}>
            {/* Planned track / projection bar (grows from baseline) */}
            <rect
              className="chart-bar"
              x={bx}
              y={plannedTop}
              width={barW}
              height={plannedH}
              rx={3}
              fill={isProjection ? "url(#weekly-hatch)" : "var(--sd-input)"}
              stroke="var(--sd-line)"
              strokeWidth={1}
              style={{ transformOrigin: `${cx}px ${PLOT.y0}px` }}
            />
            {/* Actual accent fill */}
            {actualH > 0 && (
              <rect
                className="chart-bar"
                x={bx}
                y={actualTop}
                width={barW}
                height={actualH}
                rx={3}
                fill="var(--sd-accent)"
                style={{ transformOrigin: `${cx}px ${PLOT.y0}px` }}
              />
            )}
            {/* Today marker dot above the current week */}
            {isCurrent && (
              <circle
                cx={cx}
                cy={plannedTop - 8}
                r={3}
                fill="var(--sd-accent)"
                style={{ filter: "drop-shadow(0 0 4px var(--hud-cyan-glow))" }}
              />
            )}
            {/* X label: week number */}
            <text x={cx} y={PLOT.y0 + 16} textAnchor="middle" className="chart-axis-label">
              {w.weekIndex}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line
        x1={PLOT.x0}
        x2={PLOT.x1}
        y1={PLOT.y0}
        y2={PLOT.y0}
        stroke="var(--sd-line)"
        strokeWidth={1}
      />

      <style>{`
        .chart-axis-label { fill: var(--sd-ink-faint); font-size: 10px; font-family: var(--font-mono); }
        .chart-phase-label { fill: var(--sd-ink-dull); font-size: 9.5px; font-family: var(--font-mono); letter-spacing: 0.04em; }
        .chart-col .chart-bar { transform: scaleY(0); animation: chart-grow 420ms var(--ease-out-quart) forwards; animation-delay: var(--d, 0ms); will-change: transform; }
        @keyframes chart-grow { to { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) {
          .chart-col .chart-bar { transform: none !important; animation: none !important; }
        }
      `}</style>
    </ChartFrame>
  );
}
