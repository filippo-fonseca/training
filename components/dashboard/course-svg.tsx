/**
 * The Baystate Half course, drawn from the REAL OpenStreetMap trace baked into
 * data/course/baystate-half.json (see scripts/course/bake-course.mjs). The data
 * is imported statically, so this makes NO external requests: it is a self-
 * contained SVG that projects real lon/lat onto the viewBox (equirectangular,
 * cos(lat) x-scale). A river band runs behind an accent route polyline with
 * rounded joins; km chips fall at the 5 / 10 / 15 / 20 km splits of the full
 * two-lap race, folded onto the single drawn loop; a START / FINISH flag sits at
 * the Tsongas Center; small chips mark the two bridges and LeLacheur Park.
 *
 * If the baked JSON is ever unusable, `courseGeometry` is null and we fall back
 * to the original stylized diagram (kept below), so the widget never breaks.
 */
import { course, courseGeometry } from "./course-geo";
import { CourseAvatar } from "./course-avatar";

interface CourseSvgProps {
  className?: string;
  /**
   * "mini" (default) is the dashboard widget: route, river, km chips, the
   * start/finish flag and compact landmark dots. "detail" adds labelled bridge
   * and park chips for the expanded overlay.
   */
  variant?: "mini" | "detail";
}

const ARIA =
  "Map of the Baystate Half Marathon course in Lowell, Massachusetts: a loop run twice, west along the Merrimack River across the Rourke Bridge and back across the Aiken Street Bridge, past LeLacheur Park, starting and finishing by the Tsongas Center. Kilometre markers fall at 5, 10, 15 and 20 kilometres.";

export function CourseSvg({ className, variant = "mini" }: CourseSvgProps) {
  if (!courseGeometry || !course) return <FallbackCourseSvg className={className} />;

  const g = courseGeometry;
  const detail = variant === "detail";
  const loopKm = course.loop_km;
  const { start, rourke, aiken, lelacheur } = g.landmarks;

  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ARIA}
    >
      {/* River band: a thick, soft stroke of the Merrimack centreline, with a
          brighter hairline down its middle. */}
      <path
        d={g.riverPath}
        fill="none"
        stroke="var(--sd-accent-deep)"
        strokeOpacity={0.14}
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={g.riverPath}
        fill="none"
        stroke="var(--sd-accent-deep)"
        strokeOpacity={0.4}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Route: a deep under-stroke for depth, then the accent line on top. */}
      <path
        d={g.routePath}
        fill="none"
        stroke="var(--sd-accent-deep)"
        strokeOpacity={0.55}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={g.routePath}
        fill="none"
        stroke="var(--sd-accent)"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bridge + park landmarks */}
      <Landmark x={rourke[0]} y={rourke[1]} label="Rourke Br." show={detail} />
      <Landmark x={aiken[0]} y={aiken[1]} label="Aiken Br." show={detail} />
      <Landmark x={lelacheur[0]} y={lelacheur[1]} label="LeLacheur" show={detail} park />

      {/* km chips at 5 / 10 / 15 / 20 of the full 2-lap race, folded onto the loop.
          Lap-1 splits (<= one loop) sit above their node, lap-2 splits below, so
          the coincident pairs (5/15, 10/20) never overlap. */}
      {g.markers.map((m) => {
        const above = m.km <= loopKm;
        const dy = above ? -9 : 9;
        return (
          <g key={m.km} transform={`translate(${m.x} ${m.y})`}>
            <circle r={2.1} fill="var(--sd-app)" stroke="var(--sd-accent)" strokeWidth={1.3} />
            <g transform={`translate(0 ${dy})`}>
              <rect
                x={-9}
                y={-6}
                width={18}
                height={12}
                rx={3}
                fill="var(--sd-darker-box)"
                stroke="var(--sd-line)"
                strokeWidth={0.75}
              />
              <text
                x={0}
                y={3}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={7}
                fill="var(--sd-ink-dull)"
              >
                {m.km}k
              </text>
            </g>
          </g>
        );
      })}

      {/* START / FINISH flag at the Tsongas Center */}
      <g transform={`translate(${start[0]} ${start[1]})`}>
        <line x1={0} y1={0} x2={0} y2={-15} stroke="var(--sd-ink-dull)" strokeWidth={1.2} />
        <path d="M 0 -15 L 11 -12 L 0 -9 Z" fill="var(--sd-accent)" />
        <circle r={2.8} fill="var(--sd-accent)" stroke="var(--sd-app)" strokeWidth={1} />
        <text
          x={4}
          y={9}
          textAnchor="start"
          fontFamily="var(--font-mono)"
          fontSize={7}
          letterSpacing={0.4}
          fill="var(--sd-ink-faint)"
        >
          START / FINISH
        </text>
      </g>

      {/* The runner: the author's avatar travels the loop forever (parked at the
          START / FINISH point under prefers-reduced-motion). Drawn last so it
          rides on top of the route line. */}
      <CourseAvatar points={g.routePoints} radius={detail ? 8 : 9} />
    </svg>
  );
}

/** A small landmark marker: a dot always, with a label only in the detail view. */
function Landmark({
  x,
  y,
  label,
  show,
  park = false,
}: {
  x: number;
  y: number;
  label: string;
  show: boolean;
  park?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {park ? (
        <rect x={-2.1} y={-2.1} width={4.2} height={4.2} rx={0.8} fill="var(--sd-accent-faint)" />
      ) : (
        <circle r={2.1} fill="var(--sd-app)" stroke="var(--sd-accent-faint)" strokeWidth={1.2} />
      )}
      {show ? (
        <text
          x={0}
          y={-5}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={6.5}
          letterSpacing={0.3}
          fill="var(--sd-ink-faint)"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

/* ------------------------------------------------------------------------- */
/* Fallback: the original hand-built stylized diagram. Retained verbatim so the */
/* widget still renders an intentional shape if the baked JSON is unusable.     */
/* ------------------------------------------------------------------------- */

const OUTBOUND = "M 44 118 C 120 128, 210 96, 300 92 S 352 86, 366 74";
const RETURN = "M 366 74 C 372 92, 340 108, 300 110 S 150 138, 52 132";
const FALLBACK_KM: Array<[number, number, string]> = [
  [150, 112, "5"],
  [300, 92, "10"],
  [352, 82, "15"],
  [180, 124, "20"],
];

function FallbackCourseSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 180"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Stylized diagram of the Baystate Half course: a loop along the Merrimack River in Lowell, Massachusetts, with kilometre markers at 5, 10, 15 and 20 and start and finish near the Tsongas Center."
    >
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
      <circle cx={366} cy={74} r={4} fill="var(--sd-accent)" />
      {FALLBACK_KM.map(([x, y, label]) => (
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
    </svg>
  );
}
