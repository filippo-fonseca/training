/**
 * Google Maps layer config for the course widget. This is the ONLY part of the
 * app allowed to talk to an external host, and only when a browser Maps key is
 * present in NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Geometry always comes from the
 * baked OSM loop (components/dashboard/course-geo). When the key is absent, the
 * widget renders the self-contained OSM SVG instead (see course-svg.tsx), so the
 * keyless / fixture build makes zero external requests.
 */
import { course, type LonLat } from "./course-geo";
import { encodePolyline } from "@/lib/course/polyline";

// Next inlines NEXT_PUBLIC_* at build time; reference it literally.
const rawKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
/** The browser Maps key, or undefined when unset/blank. */
export const mapsApiKey: string | undefined =
  rawKey && rawKey.trim().length > 0 ? rawKey.trim() : undefined;

/** True only when we can actually draw a Google map (key present + geometry). */
export const mapsEnabled = Boolean(mapsApiKey && course);

/** Accent cyan as a hex string, matching --sd-accent, for map strokes. */
export const ACCENT_HEX = "34c3e0";

const toLatLng = (p: LonLat): [number, number] => [p[1], p[0]];

/** The baked loop as [lat, lng] pairs (empty when geometry is unusable). */
export const routeLatLng: Array<[number, number]> = course
  ? course.points.map(toLatLng)
  : [];

/** Landmark points as [lat, lng]. */
export const landmarkLatLng = course
  ? {
      start: toLatLng(course.landmarks.start_finish),
      rourke: toLatLng(course.landmarks.rourke_bridge),
      aiken: toLatLng(course.landmarks.aiken_bridge),
      lelacheur: toLatLng(course.landmarks.lelacheur_park),
    }
  : null;

// --- dark style shared by Static + JS maps (night-canvas palette) ---
interface Styler {
  featureType?: string;
  elementType?: string;
  stylers: Array<Record<string, string>>;
}

/** Style objects for the Maps JavaScript API. */
export const MAP_STYLE_JS: Styler[] = [
  { elementType: "geometry", stylers: [{ color: "#0e1116" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5a6472" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0e1116" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a3140" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2230" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#141c28" }] },
];

// Equivalent style for the Static Maps API (repeated &style= params).
const STATIC_STYLE_PARAMS = [
  "element:geometry|color:0x0e1116",
  "element:labels.text.fill|color:0x5a6472",
  "element:labels.text.stroke|color:0x0e1116",
  "feature:administrative|element:geometry|color:0x2a3140",
  "feature:poi|visibility:off",
  "feature:road|element:geometry|color:0x1c2230",
  "feature:road|element:labels|visibility:off",
  "feature:transit|visibility:off",
  "feature:water|element:geometry|color:0x141c28",
];

/**
 * Build the Static Maps API URL for the mini widget. The loop is passed as an
 * encoded polyline (no center/zoom, so the API auto-fits the path). Returns null
 * when the key or geometry is missing (caller then renders the SVG).
 *
 * Shape (KEY redacted):
 *   https://maps.googleapis.com/maps/api/staticmap
 *     ?size=640x360&scale=2
 *     &path=color:0x34c3e0ff|weight:4|enc:<ENCODED_LOOP>
 *     &style=element:geometry|color:0x0e1116  (x9)
 *     &key=KEY
 */
export function buildStaticMapUrl(
  key: string | undefined = mapsApiKey,
  size = "640x360",
): string | null {
  if (!key || routeLatLng.length === 0) return null;
  const enc = encodePolyline(routeLatLng);
  const params = [
    `size=${size}`,
    "scale=2",
    "format=png",
    `path=${encodeURIComponent(`color:0x${ACCENT_HEX}ff|weight:4|enc:${enc}`)}`,
    ...STATIC_STYLE_PARAMS.map((s) => `style=${encodeURIComponent(s)}`),
    `key=${encodeURIComponent(key)}`,
  ];
  return `https://maps.googleapis.com/maps/api/staticmap?${params.join("&")}`;
}
