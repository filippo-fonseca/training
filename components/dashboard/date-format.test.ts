import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityDateShort } from './data';

// -----------------------------------------------------------------------------
// Activity date displays resolve the calendar day in the app display timezone
// (America/New_York) BEFORE formatting (DEF-L2-2). Slicing the raw UTC date shows
// the next day for a late-evening EDT run stored past midnight UTC.
// -----------------------------------------------------------------------------

test('activityDateShort: a late-evening EDT run does not roll to the next UTC day', () => {
  // 2026-07-13 20:20:48 EDT is stored as 2026-07-14T00:20:48Z. It must display as
  // Jul 13 (the day it was actually run), not Jul 14 (the raw UTC date).
  assert.equal(activityDateShort('2026-07-14T00:20:48Z'), 'Jul 13');
});

test('activityDateShort: a daytime run keeps its own day', () => {
  assert.equal(activityDateShort('2026-07-13T14:00:00Z'), 'Jul 13');
});

test('activityDateShort: null start date yields null', () => {
  assert.equal(activityDateShort(null), null);
});
