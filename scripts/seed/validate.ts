// Validation: parse the plan and assert the fidelity invariants required by the
// unit criteria, then confirm the generated supabase/seed.sql is consistent.
//
// Run: npm run seed:validate  (tsx scripts/seed/validate.ts)
// Exits non-zero on any failed assertion.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlan } from './parse-plan';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SOURCE = resolve(ROOT, 'data/baystate-2026/plan-full.md');
const SEED = resolve(ROOT, 'supabase/seed.sql');

// Expected weekly planned km, straight from docs/PLAN-EXTRACT.md.
const EXPECTED_WEEKLY_KM = [16, 20, 25, 30, 35, 31, 40, 45, 41, 54, 57, 58, 43, 34.1];
const EXPECTED_LONG_RUN = [5.2, 7, 8, 10, 12, 9, 14, 16, 13, 21.1, 18, 20, 14, 21.1];
const EXPECTED_TOTAL_KM = 529.1;

const failures: string[] = [];
const notes: string[] = [];

function check(cond: boolean, msg: string): void {
  if (!cond) failures.push(msg);
}

function approx(a: number, b: number, eps = 0.05): boolean {
  return Math.abs(a - b) <= eps;
}

const plan = parsePlan(readFileSync(SOURCE, 'utf8'));
const days = plan.weeks.flatMap((w) => w.days);

// 1. Exactly 98 days, 14 weeks, contiguous indices.
check(plan.weeks.length === 14, `Expected 14 weeks, got ${plan.weeks.length}`);
check(days.length === 98, `Expected 98 days, got ${days.length}`);
days.forEach((d, i) => check(d.dayIndex === i + 1, `Day index gap at position ${i}: got ${d.dayIndex}`));

// 2. Date range + contiguity (no missing/duplicate dates, 7 days per week).
check(days[0]!.date === '2026-07-13', `First day should be 2026-07-13, got ${days[0]!.date}`);
check(days[97]!.date === '2026-10-18', `Last day should be 2026-10-18, got ${days[97]!.date}`);
const seenDates = new Set<string>();
for (let i = 0; i < days.length; i++) {
  const d = days[i]!;
  check(!seenDates.has(d.date), `Duplicate date ${d.date}`);
  seenDates.add(d.date);
  if (i > 0) {
    const prev = new Date(days[i - 1]!.date + 'T00:00:00Z').getTime();
    const cur = new Date(d.date + 'T00:00:00Z').getTime();
    check(cur - prev === 86400000, `Non-contiguous dates: ${days[i - 1]!.date} -> ${d.date}`);
  }
}
for (const w of plan.weeks) {
  check(w.days.length === 7, `Week ${w.weekIndex} should have 7 days, got ${w.days.length}`);
}

// 3. days_to_race counts down to 0 on race day.
check(days[97]!.daysToRace === 0, `Race day should be 0 days to race, got ${days[97]!.daysToRace}`);
days.forEach((d) => {
  const expected = 98 - d.dayIndex;
  check(d.daysToRace === expected, `Day ${d.date}: days_to_race ${d.daysToRace} != ${expected}`);
});

// 4. Weekly km sums: daily sum == parsed planned == docs expectation.
plan.weeks.forEach((w, i) => {
  const dailySum = w.days.reduce((n, d) => n + d.plannedRunKm, 0);
  check(
    approx(dailySum, w.plannedKm ?? -1),
    `Week ${w.weekIndex}: daily sum ${dailySum.toFixed(1)} != planned ${w.plannedKm}`,
  );
  check(
    approx(dailySum, EXPECTED_WEEKLY_KM[i]!),
    `Week ${w.weekIndex}: daily sum ${dailySum.toFixed(1)} != docs ${EXPECTED_WEEKLY_KM[i]}`,
  );
  check(
    approx(w.longRunKm ?? -1, EXPECTED_LONG_RUN[i]!),
    `Week ${w.weekIndex}: long run ${w.longRunKm} != docs ${EXPECTED_LONG_RUN[i]}`,
  );
});

// 5. Grand total km.
const total = days.reduce((n, d) => n + d.plannedRunKm, 0);
check(approx(total, EXPECTED_TOTAL_KM), `Total km ${total.toFixed(1)} != ${EXPECTED_TOTAL_KM}`);

// 6. Cumulative km is monotonic and ends at the total.
let prevCum = 0;
for (const d of days) {
  check(d.cumulativeKm !== null, `Day ${d.date}: missing cumulative km`);
  check((d.cumulativeKm ?? 0) >= prevCum - 0.001, `Day ${d.date}: cumulative km decreased`);
  prevCum = d.cumulativeKm ?? prevCum;
}
check(approx(prevCum, EXPECTED_TOTAL_KM), `Final cumulative ${prevCum} != ${EXPECTED_TOTAL_KM}`);

// 7. No missing sessions: every day has a primary + secondary, primary has a title.
for (const d of days) {
  const primary = d.sessions.find((s) => s.slot === 'primary');
  const secondary = d.sessions.find((s) => s.slot === 'secondary');
  check(!!primary, `Day ${d.date}: missing primary session`);
  check(!!secondary, `Day ${d.date}: missing secondary session`);
  check(!!primary && primary.title.length > 0, `Day ${d.date}: empty primary title`);
  check(!!primary && !!primary.prescriptionText, `Day ${d.date}: missing prescription`);
  check(!!primary && !!primary.category, `Day ${d.date}: missing category`);
}

// 8. Run days per week match the parsed run-day count (>0 km primary run sessions).
const RUN_CATEGORIES = new Set(['easy_run', 'long_run', 'quality_run', 'race']);
plan.weeks.forEach((w) => {
  const runDays = w.days.filter((d) => {
    const primary = d.sessions.find((s) => s.slot === 'primary');
    return primary && RUN_CATEGORIES.has(primary.category ?? '') && d.plannedRunKm > 0;
  }).length;
  check(
    runDays === (w.runDays ?? -1),
    `Week ${w.weekIndex}: counted ${runDays} run days != stated ${w.runDays}`,
  );
});

// 9. Exactly one race on 2026-10-18; exactly one 21.1 km training run (Sep 20).
const raceDays = days.filter((d) =>
  d.sessions.some((s) => s.slot === 'primary' && s.category === 'race'),
);
check(raceDays.length === 1, `Expected 1 race day, got ${raceDays.length}`);
check(raceDays[0]?.date === '2026-10-18', `Race should be 2026-10-18, got ${raceDays[0]?.date}`);
const trainingFullDistance = days.filter(
  (d) =>
    d.plannedRunKm === 21.1 &&
    !d.sessions.some((s) => s.slot === 'primary' && s.category === 'race'),
);
check(
  trainingFullDistance.length === 1 && trainingFullDistance[0]?.date === '2026-09-20',
  `Expected one 21.1 km training run on 2026-09-20, got ${trainingFullDistance
    .map((d) => d.date)
    .join(',')}`,
);

// 10. Structure counts.
check(plan.phases.length === 11, `Expected 11 phases, got ${plan.phases.length}`);
check(plan.checkpoints.length === 4, `Expected 4 checkpoints, got ${plan.checkpoints.length}`);
check(plan.milestones.length === 9, `Expected 9 milestones, got ${plan.milestones.length}`);

// 11. Symptom-gated alternatives exist on the gated long runs.
const gated = days.filter((d) => d.alternatives.length > 0);
const gatedDates = new Set(gated.map((d) => d.date));
check(gatedDates.has('2026-09-20'), 'Missing alternatives on the 21.1 km gated run (2026-09-20)');
check(gatedDates.has('2026-10-04'), 'Missing alternatives on the conditional second long run (2026-10-04)');
for (const d of ['2026-09-20', '2026-10-04']) {
  const day = days.find((x) => x.date === d)!;
  const gates = new Set(day.alternatives.map((a) => a.gate));
  check(gates.has('green') && gates.has('yellow') && gates.has('red'), `Day ${d}: expected green/yellow/red alternatives, got ${[...gates].join(',')}`);
}
notes.push(`Gated days with alternatives: ${gated.map((d) => d.date).join(', ')}`);

// 12. Phases tile weeks 1..14 with no gaps/overlaps.
let cursor = 1;
for (const p of plan.phases) {
  check(p.startWeek === cursor, `Phase ${p.phaseIndex} starts at week ${p.startWeek}, expected ${cursor}`);
  check(p.endWeek >= p.startWeek, `Phase ${p.phaseIndex} has inverted week range`);
  cursor = p.endWeek + 1;
}
check(cursor === 15, `Phases should cover through week 14, ended at ${cursor - 1}`);

// 13. Generated seed.sql sanity (if present): row counts + balanced transaction.
if (existsSync(SEED)) {
  const sql = readFileSync(SEED, 'utf8');
  const count = (re: RegExp) => (sql.match(re) ?? []).length;
  check(/^begin;/m.test(sql) && /^commit;/m.test(sql), 'seed.sql missing begin/commit');
  check(count(/insert into public\.plan_days /g) === 98, `seed.sql should upsert 98 plan_days, got ${count(/insert into public\.plan_days /g)}`);
  check(count(/insert into public\.day_sessions /g) === 196, `seed.sql should upsert 196 day_sessions, got ${count(/insert into public\.day_sessions /g)}`);
  check(count(/insert into public\.plan_weeks /g) === 14, `seed.sql should upsert 14 plan_weeks`);
  check(count(/insert into public\.plan_phases /g) === 11, `seed.sql should upsert 11 plan_phases`);
  check(count(/insert into public\.milestones /g) === 9, `seed.sql should upsert 9 milestones`);
  check(count(/insert into public\.checkpoints /g) === 4, `seed.sql should upsert 4 checkpoints`);
  const altCount = count(/insert into public\.day_alternatives /g);
  check(altCount >= 8, `seed.sql should have alternatives for gated days, got ${altCount}`);
  notes.push(`seed.sql present: ${altCount} day_alternatives rows`);
} else {
  notes.push('seed.sql not generated yet (run seed:generate) — data-level checks only.');
}

// -----------------------------------------------------------------------------
for (const n of notes) console.log(`note: ${n}`);
if (failures.length) {
  console.error(`\nVALIDATION FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `\nVALIDATION PASSED: 14 weeks, 98 days, 196 sessions, ` +
    `${EXPECTED_TOTAL_KM} km total, weekly sums match docs, no missing sessions.`,
);
