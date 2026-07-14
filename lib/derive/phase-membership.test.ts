import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  phaseForDate,
  phaseForWeek,
  assignWeeksToPhases,
  overlappingPhaseIds,
} from './phase-membership';

/** Minimal phase/week factories mirroring the fields the rule reads. */
function phase(id: string, start: string | null, end: string | null) {
  return { id, start_date: start, end_date: end };
}
function week(id: string, week_index: number, start: string | null) {
  return { id, week_index, start_date: start };
}

// A tidy contiguous plan: three back-to-back weekly phases.
const P1 = phase('p1', '2026-07-13', '2026-07-26'); // weeks 1-2
const P2 = phase('p2', '2026-07-27', '2026-08-09'); // weeks 3-4
const P3 = phase('p3', '2026-08-10', '2026-08-23'); // weeks 5-6

test('phaseForDate: date containment picks the phase whose window holds the date', () => {
  assert.equal(phaseForDate([P1, P2, P3], '2026-07-13')?.id, 'p1'); // start edge
  assert.equal(phaseForDate([P1, P2, P3], '2026-07-26')?.id, 'p1'); // end edge (inclusive)
  assert.equal(phaseForDate([P1, P2, P3], '2026-07-27')?.id, 'p2');
  assert.equal(phaseForDate([P1, P2, P3], '2026-08-20')?.id, 'p3');
});

test('phaseForWeek: a week is placed by its own start_date', () => {
  const phases = [P1, P2, P3];
  assert.equal(phaseForWeek(phases, week('w1', 1, '2026-07-13'))?.id, 'p1');
  assert.equal(phaseForWeek(phases, week('w3', 3, '2026-07-27'))?.id, 'p2');
  assert.equal(phaseForWeek(phases, week('w5', 5, '2026-08-10'))?.id, 'p3');
});

test('tie-break: overlapping phases resolve to the latest start_date', () => {
  const broad = phase('broad', '2026-07-13', '2026-08-23'); // spans everything
  const inner = phase('inner', '2026-08-01', '2026-08-10'); // later start, nested
  // 2026-08-05 sits in both; the later-starting (more specific) phase wins.
  assert.equal(phaseForDate([broad, inner], '2026-08-05')?.id, 'inner');
  // Order of the input array must not change the result.
  assert.equal(phaseForDate([inner, broad], '2026-08-05')?.id, 'inner');
  // A date only in the broad phase still resolves to broad.
  assert.equal(phaseForDate([broad, inner], '2026-07-20')?.id, 'broad');
});

test('tie-break: equal start_date prefers the narrower window', () => {
  const wide = phase('wide', '2026-07-13', '2026-08-23');
  const narrow = phase('narrow', '2026-07-13', '2026-07-20');
  assert.equal(phaseForDate([wide, narrow], '2026-07-15')?.id, 'narrow');
  assert.equal(phaseForDate([narrow, wide], '2026-07-15')?.id, 'narrow');
});

test('orphan: a date/week matching no phase belongs to none', () => {
  assert.equal(phaseForDate([P1, P2, P3], '2026-07-01'), null); // before all
  assert.equal(phaseForDate([P1, P2, P3], '2026-09-01'), null); // after all
  assert.equal(phaseForWeek([P1, P2, P3], week('wX', 9, '2026-12-25')), null);
});

test('null-dated phases match nothing', () => {
  const noStart = phase('ns', null, '2026-07-26');
  const noEnd = phase('ne', '2026-07-13', null);
  const both = phase('nb', null, null);
  assert.equal(phaseForDate([noStart, noEnd, both], '2026-07-15'), null);
  // A null week start_date also matches nothing.
  assert.equal(phaseForDate([P1], null), null);
  assert.equal(phaseForWeek([P1], week('wn', 1, null)), null);
});

test('assignWeeksToPhases: groups weeks, sorts by week_index, collects orphans', () => {
  const weeks = [
    week('w2', 2, '2026-07-20'),
    week('w1', 1, '2026-07-13'),
    week('w3', 3, '2026-07-27'),
    week('w5', 5, '2026-08-10'),
    week('orphan', 9, '2026-12-25'),
  ];
  const { byPhaseId, orphans } = assignWeeksToPhases([P1, P2, P3], weeks);
  assert.deepEqual(
    byPhaseId.get('p1')?.map((w) => w.week_index),
    [1, 2], // sorted even though inserted 2 then 1
  );
  assert.deepEqual(byPhaseId.get('p2')?.map((w) => w.week_index), [3]);
  assert.deepEqual(byPhaseId.get('p3')?.map((w) => w.week_index), [5]);
  assert.deepEqual(orphans.map((w) => w.id), ['orphan']);
});

test('assignWeeksToPhases: overlap tie-break flows through to grouping', () => {
  const broad = phase('broad', '2026-07-13', '2026-08-23');
  const inner = phase('inner', '2026-08-10', '2026-08-23');
  const weeks = [week('w1', 1, '2026-07-13'), week('w5', 5, '2026-08-10')];
  const { byPhaseId } = assignWeeksToPhases([broad, inner], weeks);
  assert.deepEqual(byPhaseId.get('broad')?.map((w) => w.week_index), [1]);
  assert.deepEqual(byPhaseId.get('inner')?.map((w) => w.week_index), [5]);
});

test('overlappingPhaseIds: flags intersecting windows, ignores null-dated', () => {
  assert.deepEqual([...overlappingPhaseIds([P1, P2, P3])], []); // contiguous, no overlap
  const broad = phase('broad', '2026-07-13', '2026-08-23');
  const inner = phase('inner', '2026-08-01', '2026-08-10');
  const nulled = phase('nulled', null, null);
  const ids = overlappingPhaseIds([broad, inner, nulled]);
  assert.equal(ids.has('broad'), true);
  assert.equal(ids.has('inner'), true);
  assert.equal(ids.has('nulled'), false);
});
