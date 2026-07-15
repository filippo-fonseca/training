/**
 * Web Mercator projection helpers for the Google Static Maps course render.
 *
 * The Static Maps API can auto-fit a path, but auto-fit crops tight and gives us
 * no way to know where each point lands in the returned image. Instead we pick an
 * EXPLICIT center + integer zoom from the loop's bounds (standard Google-style
 * Mercator math), which (a) lets us zoom out with a comfortable margin and (b)
 * lets us project every polyline point to an exact pixel in the image so an
 * overlaid avatar can track the drawn line.
 *
 * All math here is pure and dependency-free so it is unit-testable without a key.
 * See https://developers.google.com/maps/documentation/javascript/coordinates
 */

/** Google's base tile size in pixels at zoom 0. */
export const TILE_SIZE = 256;

/** Nominal Static Maps request size (the &size= base; &scale=2 only doubles DPI,
 * not the covered area, so projection math uses these base dimensions).
 *
 * The course cell is a wide bento tile (lg grid rows 5-6 x cols 1-6, ~2.6:1 at
 * 1440x900). The image is requested at 560x224 (2.5:1): matching the cell's
 * aspect keeps the object-contain letterbox to a hair (~4% of the longer axis,
 * and map-colored so it is invisible), while sizing the frame tight to the loop
 * pulls the integer-zoom fit to ~73% of the frame height, so the whole loop
 * renders large and uncropped with a comfortable ~13% margin on every side. See
 * chooseStaticView for the margin guarantee and mercator.test for the fit proof. */
export const STATIC_MAP_WIDTH = 560;
export const STATIC_MAP_HEIGHT = 224;

/** Comfortable margin: the loop must leave at least this fraction of the image
 * clear on the tighter axis, else we step one zoom level further out. */
export const MARGIN_FRACTION = 0.08;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface StaticView {
  center: LatLng;
  zoom: number;
}

/**
 * The Mercator "latitude fraction": ln((1+sin)/(1-sin))/2, clamped to the valid
 * Web Mercator range (~+/-85.05 deg maps to +/-pi). This is the raw y-coordinate
 * before scaling by the world size.
 */
export function latRad(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = Math.log((1 + sin) / (1 - sin)) / 2;
  return clamp(y, -Math.PI, Math.PI);
}

/** Project lat/lng to absolute world pixel coordinates at a given zoom. */
export function projectWorld(lat: number, lng: number, zoom: number): Point {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - latRad(lat) / (2 * Math.PI)) * scale;
  return { x, y };
}

/** Axis-aligned lon/lat bounds of a set of [lat, lng] points. */
export function boundsOfLatLng(points: ReadonlyArray<readonly [number, number]>): Bounds {
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;
  for (const [lat, lng] of points) {
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lng < west) west = lng;
  }
  return { north, south, east, west };
}

/**
 * The fractional zoom at which the bounds exactly fill the image on the tighter
 * axis (Google's standard fit formula). Larger zoom = more magnified, so the
 * limiting (smaller) of the two per-axis zooms is the fit.
 */
export function fitZoom(bounds: Bounds, width: number, height: number): number {
  const latFraction = (latRad(bounds.north) - latRad(bounds.south)) / (2 * Math.PI);
  const lngSpan = bounds.east - bounds.west;
  const lngFraction = (lngSpan < 0 ? lngSpan + 360 : lngSpan) / 360;
  const latZoom = Math.log2(height / TILE_SIZE / latFraction);
  const lngZoom = Math.log2(width / TILE_SIZE / lngFraction);
  return Math.min(latZoom, lngZoom);
}

/** Pixel span of the bounds at an integer zoom, for the margin check. */
function spanAtZoom(bounds: Bounds, zoom: number): Point {
  const nw = projectWorld(bounds.north, bounds.west, zoom);
  const se = projectWorld(bounds.south, bounds.east, zoom);
  return { x: Math.abs(se.x - nw.x), y: Math.abs(se.y - nw.y) };
}

/**
 * Choose an explicit center + integer zoom for the loop, with a comfortable
 * margin. Steps: take the integer zoom that fits the whole loop within the
 * image; then, if that fit is tighter than MARGIN_FRACTION padding on either
 * side, step one zoom level further out (the requested zoom-out).
 */
export function chooseStaticView(
  points: ReadonlyArray<readonly [number, number]>,
  width: number = STATIC_MAP_WIDTH,
  height: number = STATIC_MAP_HEIGHT,
): StaticView {
  const bounds = boundsOfLatLng(points);
  const center: LatLng = {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };

  let zoom = clamp(Math.floor(fitZoom(bounds, width, height)), 0, 20);

  const span = spanAtZoom(bounds, zoom);
  const padX = (width - span.x) / 2 / width;
  const padY = (height - span.y) / 2 / height;
  if (Math.min(padX, padY) < MARGIN_FRACTION && zoom > 0) {
    zoom -= 1;
  }

  return { center, zoom };
}

/**
 * Project a lat/lng to a pixel in the nominal static-map image (top-left origin),
 * for a map rendered at `center` / `zoom`. The center sits at the image midpoint,
 * exactly as Google places it, so points line up with the drawn polyline.
 */
export function projectToImage(
  lat: number,
  lng: number,
  view: StaticView,
  width: number = STATIC_MAP_WIDTH,
  height: number = STATIC_MAP_HEIGHT,
): Point {
  const c = projectWorld(view.center.lat, view.center.lng, view.zoom);
  const p = projectWorld(lat, lng, view.zoom);
  return { x: width / 2 + (p.x - c.x), y: height / 2 + (p.y - c.y) };
}

/**
 * The padding actually achieved at the chosen view, as a fraction of the image
 * on each axis (used by tests and as a sanity signal).
 */
export function achievedPadding(
  points: ReadonlyArray<readonly [number, number]>,
  view: StaticView,
  width: number = STATIC_MAP_WIDTH,
  height: number = STATIC_MAP_HEIGHT,
): { x: number; y: number } {
  const bounds = boundsOfLatLng(points);
  const span = spanAtZoom(bounds, view.zoom);
  return {
    x: (width - span.x) / 2 / width,
    y: (height - span.y) / 2 / height,
  };
}
