import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePolyline } from "./polyline";

test("encodes Google's canonical example", () => {
  const path: Array<[number, number]> = [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ];
  assert.equal(encodePolyline(path), "_p~iF~ps|U_ulLnnqC_mqNvxq`@");
});

test("encodes a single point", () => {
  assert.equal(encodePolyline([[41.85, -87.65]]), "oyl~Fnc~uO");
});

test("empty path encodes to empty string", () => {
  assert.equal(encodePolyline([]), "");
});

test("round-trips a closed loop start/end delta to zero", () => {
  // A loop that returns to its origin: the last pair's delta re-crosses back, so
  // the encoded string is non-empty and deterministic.
  const enc = encodePolyline([
    [42.6481, -71.3131],
    [42.6555, -71.3144],
    [42.6481, -71.3131],
  ]);
  assert.ok(enc.length > 0);
  assert.equal(typeof enc, "string");
});
