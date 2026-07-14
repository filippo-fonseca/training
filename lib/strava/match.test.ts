import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayFamilies,
  matchActivities,
  nyCalendarDate,
  stravaSportFamily,
  type MatchableActivity,
  type MatchableDay,
} from './match';

test('nyCalendarDate converts a UTC instant to the America/New_York calendar date', () => {
  // 02:00 UTC on Jul 14 is 22:00 EDT on Jul 13 in New York.
  assert.equal(nyCalendarDate('2026-07-14T02:00:00Z'), '2026-07-13');
  // Noon UTC on Jul 13 is 08:00 EDT the same day.
  assert.equal(nyCalendarDate('2026-07-13T12:00:00Z'), '2026-07-13');
  assert.equal(nyCalendarDate('not-a-date'), null);
});

test('stravaSportFamily classifies sport types', () => {
  assert.equal(stravaSportFamily('Run'), 'run');
  assert.equal(stravaSportFamily('TrailRun'), 'run');
  assert.equal(stravaSportFamily('VirtualRun'), 'run');
  assert.equal(stravaSportFamily('Ride'), 'ride');
  assert.equal(stravaSportFamily('VirtualRide'), 'ride');
  assert.equal(stravaSportFamily('EBikeRide'), 'ride');
  assert.equal(stravaSportFamily('Walk'), 'other');
  assert.equal(stravaSportFamily(null), 'other');
});

test('dayFamilies derives supported families from sessions and planned km', () => {
  assert.deepEqual([...dayFamilies(['easy_run'], 0)], ['run']);
  assert.deepEqual([...dayFamilies(['bike'], 0)], ['ride']);
  assert.deepEqual([...dayFamilies([], 8)], ['run']);
  const brick = dayFamilies(['long_run', 'bike'], 0);
  assert.ok(brick.has('run') && brick.has('ride'));
  assert.deepEqual([...dayFamilies(['rest'], null)], []);
});

test('matchActivities links a run to a run day on the same NY date', () => {
  const days: MatchableDay[] = [
    { planDayId: 'day-1', date: '2026-07-13', families: new Set(['run']) },
  ];
  const acts: MatchableActivity[] = [
    { stravaId: 1, startDate: '2026-07-13T11:00:00Z', family: 'run' },
  ];
  const { matched, unmatched } = matchActivities(days, acts);
  assert.equal(matched.get(1), 'day-1');
  assert.deepEqual(unmatched, []);
});

test('matchActivities auto-links only the first of two same-day same-family runs', () => {
  const days: MatchableDay[] = [
    { planDayId: 'day-1', date: '2026-07-13', families: new Set(['run']) },
  ];
  const acts: MatchableActivity[] = [
    { stravaId: 2, startDate: '2026-07-13T18:00:00Z', family: 'run' }, // later
    { stravaId: 1, startDate: '2026-07-13T07:00:00Z', family: 'run' }, // earlier wins
  ];
  const { matched, unmatched } = matchActivities(days, acts);
  assert.equal(matched.get(1), 'day-1');
  assert.equal(matched.has(2), false);
  assert.deepEqual(unmatched, [2]);
});

test('matchActivities leaves a ride on a run-only day unmatched', () => {
  const days: MatchableDay[] = [
    { planDayId: 'day-1', date: '2026-07-13', families: new Set(['run']) },
  ];
  const acts: MatchableActivity[] = [
    { stravaId: 5, startDate: '2026-07-13T11:00:00Z', family: 'ride' },
  ];
  const { matched, unmatched } = matchActivities(days, acts);
  assert.equal(matched.size, 0);
  assert.deepEqual(unmatched, [5]);
});

test('matchActivities links both a run and a ride on a brick day', () => {
  const days: MatchableDay[] = [
    { planDayId: 'day-1', date: '2026-07-13', families: new Set(['run', 'ride']) },
  ];
  const acts: MatchableActivity[] = [
    { stravaId: 1, startDate: '2026-07-13T07:00:00Z', family: 'run' },
    { stravaId: 2, startDate: '2026-07-13T16:00:00Z', family: 'ride' },
  ];
  const { matched } = matchActivities(days, acts);
  assert.equal(matched.get(1), 'day-1');
  assert.equal(matched.get(2), 'day-1');
});

test('matchActivities marks other-sport and dateless activities unmatched', () => {
  const days: MatchableDay[] = [
    { planDayId: 'day-1', date: '2026-07-13', families: new Set(['run']) },
  ];
  const acts: MatchableActivity[] = [
    { stravaId: 9, startDate: '2026-07-13T11:00:00Z', family: 'other' },
  ];
  const { matched, unmatched } = matchActivities(days, acts);
  assert.equal(matched.size, 0);
  assert.deepEqual(unmatched, [9]);
});
