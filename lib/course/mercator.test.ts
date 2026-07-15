import { test } from "node:test";
import assert from "node:assert/strict";
import {
  achievedPadding,
  boundsOfLatLng,
  chooseStaticView,
  fitZoom,
  MARGIN_FRACTION,
  projectToImage,
  projectWorld,
  STATIC_MAP_HEIGHT,
  STATIC_MAP_WIDTH,
} from "./mercator";
import raw from "../../data/course/baystate-half.json";

// The baked Baystate loop as [lat, lng] pairs (course-geo stores [lon, lat]).
const points: Array<[number, number]> = (raw.points as Array<[number, number]>).map(
  ([lon, lat]) => [lat, lon],
);
const landmarks = raw.landmarks as unknown as Record<string, [number, number]>;

test("projectWorld matches Google's world-coordinate reference at zoom 0", () => {
  // At zoom 0 the world is one 256px tile; (0,0) lon/lat sits at its center.
  const origin = projectWorld(0, 0, 0);
  assert.ok(Math.abs(origin.x - 128) < 1e-6);
  assert.ok(Math.abs(origin.y - 128) < 1e-6);
  // Increasing longitude moves east (+x); increasing latitude moves north (-y).
  const east = projectWorld(0, 90, 0);
  assert.ok(east.x > origin.x);
  const north = projectWorld(45, 0, 0);
  assert.ok(north.y < origin.y);
});

test("fitZoom is finite and positive for the loop", () => {
  const z = fitZoom(boundsOfLatLng(points), STATIC_MAP_WIDTH, STATIC_MAP_HEIGHT);
  assert.ok(Number.isFinite(z));
  assert.ok(z > 8 && z < 18);
});

test("chooseStaticView centers the loop and leaves a comfortable margin", () => {
  const b = boundsOfLatLng(points);
  const view = chooseStaticView(points);
  // Center is the bounds midpoint.
  assert.ok(Math.abs(view.center.lat - (b.north + b.south) / 2) < 1e-9);
  assert.ok(Math.abs(view.center.lng - (b.east + b.west) / 2) < 1e-9);
  // Integer zoom.
  assert.equal(view.zoom, Math.trunc(view.zoom));
  // The whole loop clears at least the margin on the tighter axis.
  const pad = achievedPadding(points, view);
  assert.ok(
    Math.min(pad.x, pad.y) >= MARGIN_FRACTION,
    `expected >= ${MARGIN_FRACTION} padding, got x=${pad.x.toFixed(3)} y=${pad.y.toFixed(3)}`,
  );
  // ...but not absurdly zoomed out (would waste the card).
  assert.ok(Math.min(pad.x, pad.y) < 0.45);
});

test("the four landmarks project inside the image with margin", () => {
  const view = chooseStaticView(points);
  const named: Array<[string, [number, number]]> = [
    ["start_finish", landmarks.start_finish],
    ["rourke_bridge", landmarks.rourke_bridge],
    ["aiken_bridge", landmarks.aiken_bridge],
    ["lelacheur_park", landmarks.lelacheur_park],
  ];
  for (const [name, [lon, lat]] of named) {
    const p = projectToImage(lat, lon, view);
    assert.ok(
      p.x >= 0 && p.x <= STATIC_MAP_WIDTH,
      `${name} x=${p.x.toFixed(1)} outside [0, ${STATIC_MAP_WIDTH}]`,
    );
    assert.ok(
      p.y >= 0 && p.y <= STATIC_MAP_HEIGHT,
      `${name} y=${p.y.toFixed(1)} outside [0, ${STATIC_MAP_HEIGHT}]`,
    );
    // Landmarks sit on the route, so they must clear the outer margin too.
    const mx = MARGIN_FRACTION * STATIC_MAP_WIDTH;
    const my = MARGIN_FRACTION * STATIC_MAP_HEIGHT;
    assert.ok(
      p.x >= mx - 1 && p.x <= STATIC_MAP_WIDTH - mx + 1,
      `${name} x=${p.x.toFixed(1)} inside the margin band`,
    );
    assert.ok(
      p.y >= my - 1 && p.y <= STATIC_MAP_HEIGHT - my + 1,
      `${name} y=${p.y.toFixed(1)} inside the margin band`,
    );
  }
});

test("every route point projects within the image bounds", () => {
  const view = chooseStaticView(points);
  for (const [lat, lng] of points) {
    const p = projectToImage(lat, lng, view);
    assert.ok(p.x >= 0 && p.x <= STATIC_MAP_WIDTH);
    assert.ok(p.y >= 0 && p.y <= STATIC_MAP_HEIGHT);
  }
});

// The static map fills the card via object-contain (StaticCourseMap), so the
// image is scaled by min(cardW/imgW, cardH/imgH) and centered, and the drawn
// polyline is never cropped. Since the static mode cannot be exercised without a
// Maps key, this projects every route point through that exact contain transform
// into a range of plausible card aspects (1.6:1 to 3:1) and asserts the whole
// loop lands inside the visible card with clear margin. This is the fit proof.
test("the loop stays fully visible with margin under object-contain at every card aspect", () => {
  const view = chooseStaticView(points);
  const cards: Array<[number, number]> = [
    [700, 438], // 1.60:1 (narrow end)
    [700, 350], // 2.00:1
    [700, 304], // 2.30:1 (typical course cell)
    [700, 269], // 2.60:1
    [700, 233], // 3.00:1 (wide end)
  ];
  for (const [cardW, cardH] of cards) {
    // object-contain: scale to the smaller axis, center the image in the card.
    const scale = Math.min(cardW / STATIC_MAP_WIDTH, cardH / STATIC_MAP_HEIGHT);
    const offX = (cardW - STATIC_MAP_WIDTH * scale) / 2;
    const offY = (cardH - STATIC_MAP_HEIGHT * scale) / 2;
    // Margin the loop must clear on every side of the CARD (8% of the tighter axis).
    const margin = 0.08 * Math.min(cardW, cardH);
    for (const [lat, lng] of points) {
      const ip = projectToImage(lat, lng, view);
      const cx = offX + ip.x * scale;
      const cy = offY + ip.y * scale;
      assert.ok(
        cx >= margin && cx <= cardW - margin,
        `${cardW}x${cardH}: point x=${cx.toFixed(1)} inside the margin band`,
      );
      assert.ok(
        cy >= margin && cy <= cardH - margin,
        `${cardW}x${cardH}: point y=${cy.toFixed(1)} inside the margin band`,
      );
    }
  }
});
