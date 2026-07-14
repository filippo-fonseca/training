/**
 * A generated decorative route/topo pattern in accent tones, used as the
 * spotlight card media when a verified activity has no Strava photo (never an
 * empty gray box). Deterministic and self-contained: layered contour lines plus
 * a meandering route stroke. Pure SVG, no external assets.
 */
interface RoutePatternProps {
  className?: string;
  /** A seed (e.g. a Strava id) to vary the meander slightly; optional. */
  seed?: number;
}

/** Cheap deterministic pseudo-random in [0,1) from an integer seed. */
function rng(seed: number): () => number {
  let s = (seed % 2147483647) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function RoutePattern({ className, seed = 7 }: RoutePatternProps) {
  const rand = rng(seed || 7);
  // A meandering route polyline across the card.
  const pts: string[] = [];
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const x = (400 / steps) * i;
    const y = 150 + Math.sin(i * 1.1 + seed) * 46 + (rand() - 0.5) * 26;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const route = `M ${pts.join(" L ")}`;

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {/* Base wash */}
      <rect x={0} y={0} width={400} height={300} fill="var(--sd-darker-box)" />
      {/* Topo contour lines */}
      {Array.from({ length: 7 }).map((_, i) => {
        const off = i * 26;
        return (
          <path
            key={i}
            d={`M -20 ${70 + off} C 90 ${40 + off}, 150 ${100 + off}, 240 ${72 + off} S 380 ${30 + off}, 420 ${58 + off}`}
            fill="none"
            stroke="var(--sd-accent)"
            strokeOpacity={0.08 + (i % 2) * 0.04}
            strokeWidth={1.25}
          />
        );
      })}
      {/* The route */}
      <path
        d={route}
        fill="none"
        stroke="var(--sd-accent)"
        strokeOpacity={0.55}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Endpoints */}
      <circle cx={0} cy={parseFloat(pts[0].split(" ")[1])} r={4} fill="var(--sd-accent)" />
      <circle
        cx={400}
        cy={parseFloat(pts[pts.length - 1].split(" ")[1])}
        r={4}
        fill="var(--sd-accent)"
      />
    </svg>
  );
}
