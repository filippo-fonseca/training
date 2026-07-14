/**
 * A hand-built, stylized SVG diagram of the Baystate Half course: an
 * out-and-back along the Merrimack River in Lowell, MA. This is explicitly a
 * DIAGRAM, not a geographic tile map: no map library, no tiles, no external
 * fetches. A river band runs behind an accent route polyline with rounded
 * joins, km markers at 5 / 10 / 15 / 20, and START / FINISH flags near the
 * Tsongas Center area. Pure SVG, so it renders in server or client trees and
 * scales to whatever box it is placed in.
 */
interface CourseSvgProps {
  className?: string;
  /** Hide the km chips + flags for very small placements. */
  compact?: boolean;
}

// Two roughly parallel banks of an out-and-back with a turnaround at the east
// end and START/FINISH at the west end (near the Tsongas Center).
const OUTBOUND = "M 44 118 C 120 128, 210 96, 300 92 S 352 86, 366 74";
const RETURN = "M 366 74 C 372 92, 340 108, 300 110 S 150 138, 52 132";

// km markers interpolated along the route (x, y, label).
const KM_MARKERS: Array<[number, number, string]> = [
  [150, 112, "5"],
  [300, 92, "10"],
  [352, 82, "15"],
  [180, 124, "20"],
];

export function CourseSvg({ className, compact = false }: CourseSvgProps) {
  return (
    <svg
      viewBox="0 0 400 180"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Stylized diagram of the Baystate Half course: an out-and-back along the Merrimack River in Lowell, Massachusetts, with kilometre markers at 5, 10, 15 and 20 and start and finish near the Tsongas Center."
    >
      {/* River band behind the route */}
      <path
        d="M -10 150 C 90 120, 150 96, 240 80 S 360 44, 420 34 L 420 200 L -10 200 Z"
        fill="var(--sd-accent-deep)"
        fillOpacity={0.12}
      />
      <path
        d="M -10 150 C 90 120, 150 96, 240 80 S 360 44, 420 34"
        fill="none"
        stroke="var(--sd-accent-deep)"
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />

      {/* Route: return bank (dull) under the outbound (accent) for depth */}
      <path
        d={RETURN}
        fill="none"
        stroke="var(--sd-accent-deep)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.7}
      />
      <path
        d={OUTBOUND}
        fill="none"
        stroke="var(--sd-accent)"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Turnaround node at the east end */}
      <circle cx={366} cy={74} r={4} fill="var(--sd-accent)" />

      {!compact ? (
        <>
          {/* km markers */}
          {KM_MARKERS.map(([x, y, label]) => (
            <g key={label} transform={`translate(${x} ${y})`}>
              <circle r={2.4} fill="var(--sd-app)" stroke="var(--sd-accent)" strokeWidth={1.4} />
              <g transform="translate(0 -8)">
                <rect
                  x={-9}
                  y={-7}
                  width={18}
                  height={12}
                  rx={3}
                  fill="var(--sd-darker-box)"
                  stroke="var(--sd-line)"
                  strokeWidth={0.75}
                />
                <text
                  x={0}
                  y={2}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={7}
                  fill="var(--sd-ink-dull)"
                >
                  {label}k
                </text>
              </g>
            </g>
          ))}

          {/* START / FINISH flags near the Tsongas Center (west end) */}
          <g transform="translate(44 118)">
            <line x1={0} y1={0} x2={0} y2={-16} stroke="var(--sd-ink-dull)" strokeWidth={1.2} />
            <path d="M 0 -16 L 12 -13 L 0 -10 Z" fill="var(--sd-accent)" />
            <circle r={2.6} fill="var(--sd-accent)" />
            <text
              x={-2}
              y={12}
              textAnchor="start"
              fontFamily="var(--font-mono)"
              fontSize={7}
              letterSpacing={0.5}
              fill="var(--sd-ink-faint)"
            >
              START / FINISH
            </text>
          </g>
        </>
      ) : null}
    </svg>
  );
}
