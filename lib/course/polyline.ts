/**
 * Google "Encoded Polyline Algorithm Format" encoder, written from scratch (no
 * dependency) so the baked course loop can be handed to the Static Maps API as a
 * `path=enc:...` parameter. Input is an ordered list of [lat, lng] pairs.
 *
 * See https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

function encodeSignedNumber(num: number): string {
  // zig-zag encode, then base64-with-63-offset in 5-bit chunks
  let sgn = num < 0 ? ~(num << 1) : num << 1;
  let out = "";
  while (sgn >= 0x20) {
    out += String.fromCharCode((0x20 | (sgn & 0x1f)) + 63);
    sgn >>= 5;
  }
  out += String.fromCharCode(sgn + 63);
  return out;
}

/** Encode [lat, lng] pairs to a Google encoded-polyline string (5 decimals). */
export function encodePolyline(path: ReadonlyArray<readonly [number, number]>): string {
  let lastLat = 0;
  let lastLng = 0;
  let out = "";
  for (const [lat, lng] of path) {
    const iLat = Math.round(lat * 1e5);
    const iLng = Math.round(lng * 1e5);
    out += encodeSignedNumber(iLat - lastLat);
    out += encodeSignedNumber(iLng - lastLng);
    lastLat = iLat;
    lastLng = iLng;
  }
  return out;
}
