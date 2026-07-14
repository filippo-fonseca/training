/**
 * bake-course.mjs — one-time, reproducible acquisition of the REAL Baystate
 * Half Marathon course trace, baked to data/course/baystate-half.json.
 *
 * The app makes ZERO runtime external requests: this script runs at authoring
 * time, hits the public Overpass API once, assembles + simplifies the geometry,
 * and commits the result as a static JSON the widget imports. Re-run it to
 * refresh the trace from OpenStreetMap.
 *
 * Plain Node (>=18) only. No dependencies (dev or runtime).
 *
 * Usage:
 *   node scripts/course/bake-course.mjs                 # fetch live, write data file
 *   node scripts/course/bake-course.mjs --cache <dir>   # read/write raw OSM cache in <dir>
 *   node scripts/course/bake-course.mjs --out <path>    # override output path
 *   node scripts/course/bake-course.mjs --dry           # compute + validate, do not write
 *
 * Course (baystatemarathon.com/course-map-description): a double loop, ~21.1 km,
 * start/finish at the Tsongas Center (Fr. Morissette Blvd x Arcand Dr), Lowell MA.
 * One loop: west on Fr. Morissette Blvd -> Pawtucket St -> Middlesex St, across the
 * Rourke Bridge, east along Route 113 (Pawtucket Blvd / Varnum Ave north bank),
 * back across the Aiken Street Bridge, onto Perkins St past LeLacheur Park ->
 * Suffolk St, back to Fr. Morissette. The widget draws the loop once, labelled
 * "2 laps". Data (c) OpenStreetMap contributors, ODbL.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

// --- CLI args ---
const argv = process.argv.slice(2);
const getArg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const CACHE_DIR = getArg('--cache');
const OUT = getArg('--out') || join(REPO, 'data', 'course', 'baystate-half.json');
const DRY = argv.includes('--dry');

const BBOX = '42.63,-71.36,42.66,-71.29';
const UA = 'baystate-course-bake/1.0 (training-tracker build script; +https://openstreetmap.org)';
const ENDPOINT = 'https://overpass-api.de/api/interpreter';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query, cacheName) {
  const cachePath = CACHE_DIR ? join(CACHE_DIR, cacheName) : null;
  if (cachePath && existsSync(cachePath)) return JSON.parse(readFileSync(cachePath, 'utf8'));
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) { lastErr = new Error('Overpass HTTP ' + res.status); await sleep(4000 * attempt); continue; }
      const json = await res.json();
      if (cachePath) { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(cachePath, JSON.stringify(json)); }
      return json;
    } catch (e) { lastErr = e; await sleep(4000 * attempt); }
  }
  throw lastErr;
}

// --- geo helpers ---
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function hav(a, b) {
  const dphi = rad(b[1] - a[1]), dlmb = rad(b[0] - a[0]);
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dlmb / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const pathLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += hav(pts[i - 1], pts[i]); return s; };
const round5 = (p) => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];

// --- Douglas-Peucker in locally-projected metres ---
function rdpFactory(pts) {
  const lat0 = rad(pts.reduce((s, p) => s + p[1], 0) / pts.length);
  const proj = ([lon, lat]) => [lon * Math.cos(lat0) * 111320, lat * 110540];
  const perp = (p, a, b) => {
    const [px, py] = proj(p), [ax, ay] = proj(a), [bx, by] = proj(b);
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    if (L2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / L2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  const rdp = (seg, eps) => {
    if (seg.length < 3) return seg;
    let idx = 0, dmax = 0;
    for (let i = 1; i < seg.length - 1; i++) { const d = perp(seg[i], seg[0], seg[seg.length - 1]); if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > eps) return rdp(seg.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(seg.slice(idx), eps));
    return [seg[0], seg[seg.length - 1]];
  };
  return rdp;
}
function simplify(route, maxPts) {
  const rdp = rdpFactory(route);
  let eps = 3, out = rdp(route, eps);
  while (out.length > maxPts) { eps += 2; out = rdp(route, eps); }
  return { pts: out.map(round5), eps };
}

// --- build a routable graph from every highway way in the bbox ---
function buildGraph(roads) {
  const coordOf = new Map(); // nodeId -> [lon,lat]
  const adj = new Map();     // nodeId -> Map(nbrId -> metres)
  const link = (a, b, ca, cb) => {
    if (!coordOf.has(a)) coordOf.set(a, ca);
    if (!coordOf.has(b)) coordOf.set(b, cb);
    const w = hav(ca, cb);
    if (!adj.has(a)) adj.set(a, new Map());
    if (!adj.has(b)) adj.set(b, new Map());
    adj.get(a).set(b, w); adj.get(b).set(a, w); // undirected: a race line ignores one-ways
  };
  for (const el of roads.elements) {
    if (el.type !== 'way' || !el.geometry || !el.nodes) continue;
    for (let i = 1; i < el.nodes.length; i++) {
      link(el.nodes[i - 1], el.nodes[i],
        [el.geometry[i - 1].lon, el.geometry[i - 1].lat],
        [el.geometry[i].lon, el.geometry[i].lat]);
    }
  }
  return { coordOf, adj, nodes: [...coordOf.entries()] };
}

function snapper(nodes) {
  return ([lon, lat]) => {
    let best = null, bd = Infinity;
    for (const [id, c] of nodes) { const d = (c[0] - lon) ** 2 + (c[1] - lat) ** 2; if (d < bd) { bd = d; best = id; } }
    return best;
  };
}

// binary-heap Dijkstra over the undirected road graph
function dijkstra(adj, src, dst) {
  const dist = new Map([[src, 0]]), prev = new Map(), done = new Set();
  const heap = [[0, src]];
  const push = (p) => { heap.push(p); let i = heap.length - 1; while (i > 0) { const par = (i - 1) >> 1; if (heap[par][0] <= heap[i][0]) break;[heap[par], heap[i]] = [heap[i], heap[par]]; i = par; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (; ;) { let s = i, l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break;[heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
  while (heap.length) {
    const [d, u] = pop();
    if (done.has(u)) continue; done.add(u);
    if (u === dst) break;
    for (const [v, w] of adj.get(u) || []) { const nd = d + w; if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); push([nd, v]); } }
  }
  if (src !== dst && !prev.has(dst)) throw new Error('no path between waypoints ' + src + ' -> ' + dst);
  const path = [dst]; let c = dst; while (c !== src) { c = prev.get(c); path.push(c); }
  return path.reverse();
}

// Waypoints pinned onto the described streets (lon,lat), in route order. They
// force the route topology (both bridges, the correct bank); Dijkstra fills the
// on-street geometry between them. Tuned so one loop measures ~10.5 km.
const WAYPOINTS = [
  [-71.3131, 42.6481], // START/FINISH: Fr. Morissette Blvd x Arcand Dr (Tsongas Center)
  [-71.3256, 42.6497], // west on Fr. Morissette, onto Pawtucket St
  [-71.3353, 42.6447], // Pawtucket St, heading southwest
  [-71.3455, 42.6371], // onto Middlesex St, heading west
  [-71.3572, 42.6400], // across the Rourke Bridge to the north bank
  [-71.3144, 42.6555], // east on Route 113 (Pawtucket Blvd / Varnum Ave) to the Aiken St bridge, north landing
  [-71.3176, 42.6526], // across the Aiken Street Bridge to the south bank, onto Aiken St
  [-71.3144, 42.6509], // Perkins St past LeLacheur Park, onto Suffolk St
  [-71.3162, 42.6486], // Suffolk St back to Fr. Morissette
  [-71.3131, 42.6481], // east on Fr. Morissette to Arcand Dr, closing the loop
];

// Landmark coordinates (lon,lat), for flags/chips in the widget.
const LANDMARKS = {
  start_finish: [-71.3131, 42.6481], // Fr. Morissette x Arcand, by the Tsongas Center
  rourke_bridge: [-71.35678, 42.63853], // Rourke Bridge deck over the Merrimack
  aiken_bridge: [-71.3154, 42.65474], // Aiken Street Bridge deck
  lelacheur_park: [-71.31283, 42.65478], // Edward A. LeLacheur Park
};

// greedy nearest-endpoint stitch of the Merrimack way segments (growing from
// BOTH ends so a mid-river starting segment still collects its neighbours),
// clip to the course longitude span (so the band sits under the route with no
// long empty tail), then simplify.
function stitchRiver(river, lonRange) {
  let segs = river.elements.filter((e) => e.type === 'way' && e.geometry).map((e) => e.geometry.map((n) => [n.lon, n.lat]));
  if (!segs.length) return [];
  let line = segs.shift();
  let grew = true;
  while (segs.length && grew) {
    grew = false;
    const head = line[0], tail = line[line.length - 1];
    let bi = -1, mode = '', bd = Infinity; // mode: tail-fwd, tail-rev, head-fwd, head-rev
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i], a = s[0], b = s[s.length - 1];
      const cand = [
        [hav(tail, a), 'tail-fwd'], [hav(tail, b), 'tail-rev'],
        [hav(head, b), 'head-fwd'], [hav(head, a), 'head-rev'],
      ];
      for (const [d, m] of cand) if (d < bd) { bd = d; bi = i; mode = m; }
    }
    if (bi < 0 || bd > 500) break;
    let s = segs.splice(bi, 1)[0];
    if (mode === 'tail-fwd') line.push(...s.slice(1));
    else if (mode === 'tail-rev') line.push(...s.reverse().slice(1));
    else if (mode === 'head-fwd') line = s.slice(0, -1).concat(line);
    else line = s.reverse().slice(0, -1).concat(line);
    grew = true;
  }
  if (lonRange) {
    const [lo, hi] = lonRange;
    // river is roughly monotonic W->E after stitching; keep the contiguous run
    // within the course lon span (plus margin) so the band underlies the route.
    const inRange = line.filter((p) => p[0] >= lo && p[0] <= hi);
    if (inRange.length >= 5) line = inRange;
  }
  const rdp = rdpFactory(line);
  return rdp(line, 12).map(round5);
}

async function main() {
  // 1. roads -> graph -> route
  const roads = await overpass(
    `[out:json][timeout:90];way["highway"](${BBOX});out geom;`, 'roads-raw.json');
  const g = buildGraph(roads);
  const snap = snapper(g.nodes);
  const snapped = WAYPOINTS.map(snap);
  let route = [];
  for (let i = 1; i < snapped.length; i++) {
    const seg = dijkstra(g.adj, snapped[i - 1], snapped[i]).map((id) => g.coordOf.get(id));
    route.push(...(i > 1 ? seg.slice(1) : seg));
  }
  route = route.filter((p, i) => i === 0 || p[0] !== route[i - 1][0] || p[1] !== route[i - 1][1]);

  const rawKm = pathLen(route) / 1000;
  const { pts, eps } = simplify(route, 400);
  const loopKm = Math.round((pathLen(pts) / 1000) * 100) / 100;

  // 2. river centreline (Merrimack), stitched into one polyline for the band,
  //    clipped to the course longitude span (+ margin) so it has no empty tail
  const lons = pts.map((p) => p[0]);
  const margin = 0.004;
  const lonRange = [Math.min(...lons) - margin, Math.max(...lons) + margin];
  const river = await overpass(
    `[out:json][timeout:90];way["waterway"="river"]["name"="Merrimack River"](${BBOX});out geom;`, 'river-raw.json');
  const riverLine = stitchRiver(river, lonRange);

  // 3. validate
  const problems = [];
  if (!(loopKm >= 10.3 && loopKm <= 10.7)) problems.push(`loop_km ${loopKm} outside 10.3-10.7`);
  if (pts.length > 400) problems.push(`points ${pts.length} exceeds 400`);
  if (pts.length < 40) problems.push(`points ${pts.length} implausibly low`);
  const closeGap = hav(pts[0], pts[pts.length - 1]);
  if (closeGap > 120) problems.push(`loop not closed: ${closeGap.toFixed(0)} m gap`);
  if (riverLine.length < 5) problems.push(`river polyline too short: ${riverLine.length} pts`);

  console.log(`raw route:    ${route.length} pts, ${rawKm.toFixed(3)} km`);
  console.log(`simplified:   ${pts.length} pts (eps=${eps} m)`);
  console.log(`loop_km:      ${loopKm} (2 laps = ${(loopKm * 2).toFixed(2)} km)`);
  console.log(`loop close:   ${closeGap.toFixed(0)} m gap`);
  console.log(`river:        ${riverLine.length} pts`);
  if (problems.length) { console.error('VALIDATION FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
  console.log('validation:   OK');

  const out = {
    source: 'OpenStreetMap',
    license: 'ODbL, (c) OpenStreetMap contributors',
    loop_km: loopKm,
    laps: 2,
    points: pts,
    river: riverLine,
    landmarks: Object.fromEntries(Object.entries(LANDMARKS).map(([k, v]) => [k, round5(v)])),
  };

  if (DRY) { console.log('dry run: not writing'); return; }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log('wrote:        ' + OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
