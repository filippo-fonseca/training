/**
 * Projection + geometry for the REAL Baystate Half course trace.
 *
 * The trace itself is baked from OpenStreetMap into
 * data/course/baystate-half.json by scripts/course/bake-course.mjs and imported
 * STATICALLY here, so the page makes zero runtime external requests. This module
 * turns the lon/lat data into SVG-space paths and marker positions.
 *
 * If the committed JSON is ever malformed (wrong shape / hand-edited badly),
 * `courseGeometry` is null and callers fall back to the stylized diagram.
 */
import raw from "@/data/course/baystate-half.json";

export type LonLat = [number, number];

export interface CourseData {
  source: string;
  license: string;
  loop_km: number;
  laps: number;
  points: LonLat[];
  river: LonLat[];
  landmarks: {
    start_finish: LonLat;
    rourke_bridge: LonLat;
    aiken_bridge: LonLat;
    lelacheur_park: LonLat;
  };
}

function isLonLat(p: unknown): p is LonLat {
  return Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number";
}

function isCourseData(d: unknown): d is CourseData {
  if (!d || typeof d !== "object") return false;
  const c = d as Record<string, unknown>;
  const lm = c.landmarks as Record<string, unknown> | undefined;
  return (
    Array.isArray(c.points) && c.points.length > 10 && c.points.every(isLonLat) &&
    Array.isArray(c.river) && c.river.every(isLonLat) &&
    typeof c.loop_km === "number" && typeof c.laps === "number" &&
    !!lm && isLonLat(lm.start_finish) && isLonLat(lm.rourke_bridge) &&
    isLonLat(lm.aiken_bridge) && isLonLat(lm.lelacheur_park)
  );
}

/** The validated course, or null when the baked JSON is unusable. */
export const course: CourseData | null = isCourseData(raw) ? raw : null;

// --- geometry ---
const EARTH = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
function haversine(a: LonLat, b: LonLat): number {
  const dphi = rad(b[1] - a[1]);
  const dlmb = rad(b[0] - a[0]);
  const h =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dlmb / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.sqrt(h));
}

export interface Marker {
  /** Cumulative race km this marker represents (5, 10, 15, 20). */
  km: number;
  x: number;
  y: number;
}

export interface CourseGeometry {
  /** viewBox width/height, aspect-matched to the data so the trace fills it. */
  width: number;
  height: number;
  /** SVG path "M ... L ..." for the route polyline. */
  routePath: string;
  /** SVG path for the river centreline (stroked thick as a band). */
  riverPath: string;
  /** Projected landmark points. */
  landmarks: {
    start: readonly [number, number];
    rourke: readonly [number, number];
    aiken: readonly [number, number];
    lelacheur: readonly [number, number];
  };
  /** km chips at 5/10/15/20 of the full 2-lap race, folded onto the one loop. */
  markers: Marker[];
}

/**
 * Build the SVG geometry once. Equirectangular projection (x scaled by cos(lat)
 * so the aspect ratio is true at this latitude), fit into a padded viewBox whose
 * height is derived from the data aspect. km markers fold the full race distance
 * (laps * loop_km) onto the single drawn loop: a cumulative distance C maps to
 * the point at (C mod loopLength) along the loop, so lap-2 splits (15k, 20k) land
 * on their real physical position on the loop.
 */
function build(width: number, pad: number): CourseGeometry | null {
  if (!course) return null;
  const { points, river, landmarks, loop_km, laps } = course;

  const lat0 = points.reduce((s, p) => s + p[1], 0) / points.length;
  const kx = Math.cos(rad(lat0));
  const projX = (lon: number) => lon * kx;

  const every = [...points, ...river, ...Object.values(landmarks)];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lon, lat] of every) {
    const x = projX(lon);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  }
  const dataW = maxX - minX || 1;
  const dataH = maxY - minY || 1;
  const availW = width - 2 * pad;
  const scale = availW / dataW;
  const height = Math.round(dataH * scale + 2 * pad);

  const project = ([lon, lat]: LonLat): readonly [number, number] => [
    pad + (projX(lon) - minX) * scale,
    pad + (maxY - lat) * scale, // flip: north is up
  ];

  const toPath = (pts: LonLat[]) =>
    pts
      .map((p, i) => {
        const [x, y] = project(p);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

  // cumulative geographic distance along the loop
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + haversine(points[i - 1], points[i]));
  const loopLen = cum[cum.length - 1];

  const pointAtDistance = (dist: number): LonLat => {
    let target = dist % loopLen;
    if (target < 0) target += loopLen;
    for (let i = 1; i < cum.length; i++) {
      if (cum[i] >= target) {
        const seg = cum[i] - cum[i - 1] || 1;
        const t = (target - cum[i - 1]) / seg;
        const a = points[i - 1], b = points[i];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
    }
    return points[points.length - 1];
  };

  const raceKm = loop_km * laps;
  const markers: Marker[] = [5, 10, 15, 20]
    .filter((km) => km <= raceKm + 0.01)
    .map((km) => {
      const [x, y] = project(pointAtDistance(km * 1000));
      return { km, x, y };
    });

  return {
    width,
    height,
    routePath: toPath(points),
    riverPath: toPath(river),
    landmarks: {
      start: project(landmarks.start_finish),
      rourke: project(landmarks.rourke_bridge),
      aiken: project(landmarks.aiken_bridge),
      lelacheur: project(landmarks.lelacheur_park),
    },
    markers,
  };
}

/** Memoized geometry for the standard 400-wide viewBox. */
export const courseGeometry: CourseGeometry | null = build(400, 16);
