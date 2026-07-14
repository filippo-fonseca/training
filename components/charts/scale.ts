/**
 * Tiny hand-built scale/geometry helpers for the SVG charts. No d3, no chart
 * library — just the linear maps and "nice" tick math the charts need. Charts
 * draw in a fixed viewBox coordinate space and scale responsively via CSS
 * (width: 100%), so all math here is in abstract chart units.
 */

export interface LinearScale {
  (value: number): number;
  domain: [number, number];
  range: [number, number];
}

/** A clamped linear scale mapping [d0,d1] -> [r0,r1]. */
export function linearScale(
  domain: [number, number],
  range: [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const fn = ((value: number) => {
    const t = (value - d0) / span;
    return r0 + t * (r1 - r0);
  }) as LinearScale;
  fn.domain = domain;
  fn.range = range;
  return fn;
}

/** Round a maximum up to a friendly axis ceiling (e.g. 58 -> 60, 529 -> 550). */
export function niceCeil(max: number): number {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    const candidate = s * pow;
    if (candidate >= max) return candidate;
  }
  return 10 * pow;
}

/** Evenly spaced tick values from 0 to `max` inclusive (count+1 ticks). */
export function ticks(max: number, count = 4): number[] {
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => round1(i * step));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build an SVG polyline `points` string from [x,y] pairs, skipping null y
 * (used so an actual-km line stops at the last logged week instead of dropping
 * to zero).
 */
export function pointsAttr(pairs: Array<[number, number | null]>): string {
  return pairs
    .filter((p): p is [number, number] => p[1] != null)
    .map(([x, y]) => `${round2(x)},${round2(y)}`)
    .join(' ');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
