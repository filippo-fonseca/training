import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TimelineEntry, TimelineStatus } from '@/app/(public)/milestones/_data';
import { parseTargetKm, toCompactMilestones, nextMilestoneIndex } from './data';

// -----------------------------------------------------------------------------
// The next-milestone switcher browses the /milestones timeline (13 entries). Its
// compact projection must carry only curated fields, preserve chronological
// order, parse a km target from the title when present, and default to the next
// entry that has not yet passed.
// -----------------------------------------------------------------------------

function entry(partial: Partial<TimelineEntry>): TimelineEntry {
  return {
    key: 'm-1',
    kind: 'milestone',
    title: 'Milestone',
    date: '2026-09-20',
    dateLabel: 'Sun, Sep 20',
    status: 'upcoming',
    isRace: false,
    description: null,
    weekNumber: null,
    milestoneType: null,
    green: null,
    yellow: null,
    red: null,
    ...partial,
  };
}

test('parseTargetKm: pulls a km target out of the title when one is named', () => {
  assert.equal(parseTargetKm('First full-distance run (21.1 km easy confidence run)'), 21.1);
  assert.equal(parseTargetKm('Week 6 cutback (31 km)'), 31);
});

test('parseTargetKm: null when the title names no km target', () => {
  assert.equal(parseTargetKm('Taper start (Week 13)'), null);
  assert.equal(parseTargetKm('Race-rhythm tune-up (3x800 m @ HM)'), null);
  assert.equal(parseTargetKm('Baystate Half Marathon'), null);
});

test('toCompactMilestones: curated fields only, order preserved', () => {
  const entries = [
    entry({ key: 'c-1', kind: 'checkpoint', title: 'After Week 3', date: '2026-08-02', dateLabel: 'Sun, Aug 2' }),
    entry({ key: 'm-3', kind: 'milestone', title: 'First full-distance run (21.1 km easy)', date: '2026-09-20', dateLabel: 'Sun, Sep 20' }),
    entry({ key: 'm-8', kind: 'milestone', title: 'Baystate Half Marathon', date: '2026-10-18', dateLabel: 'Sun, Oct 18', isRace: true }),
  ];
  const out = toCompactMilestones(entries);
  assert.deepEqual(out, [
    { id: 'c-1', title: 'After Week 3', date: '2026-08-02', dateLabel: 'Sun, Aug 2', kind: 'checkpoint', targetKm: null },
    { id: 'm-3', title: 'First full-distance run (21.1 km easy)', date: '2026-09-20', dateLabel: 'Sun, Sep 20', kind: 'milestone', targetKm: 21.1 },
    { id: 'm-8', title: 'Baystate Half Marathon', date: '2026-10-18', dateLabel: 'Sun, Oct 18', kind: 'milestone', targetKm: null },
  ]);
  // The projection carries no criteria / description / week metadata.
  assert.equal(Object.prototype.hasOwnProperty.call(out[0], 'green'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out[0], 'description'), false);
});

test('nextMilestoneIndex: the first entry that has not passed', () => {
  const statuses: TimelineStatus[] = ['passed', 'passed', 'current', 'upcoming'];
  const entries = statuses.map((status, i) => entry({ key: `e-${i}`, status }));
  assert.equal(nextMilestoneIndex(entries), 2);
});

test('nextMilestoneIndex: all passed => the last entry; empty => 0', () => {
  const allPassed = [entry({ status: 'passed' }), entry({ status: 'passed' })];
  assert.equal(nextMilestoneIndex(allPassed), 1);
  assert.equal(nextMilestoneIndex([]), 0);
});
