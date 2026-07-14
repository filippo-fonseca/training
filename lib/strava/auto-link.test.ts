import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TypedSupabaseClient } from '@/lib/db/client';
import {
  AUTO_LINK_HOUR,
  chicagoCalendarDate,
  chicagoDateHour,
  pickRunSession,
  runAutoLink,
} from './auto-link';

// -----------------------------------------------------------------------------
// Chicago civil date + hour, including DST edges. The Vercel cron fires at 03:00
// AND 04:00 UTC; the internal guard proceeds only at 22:00 America/Chicago. In
// summer (CDT, UTC-5) the 03:00 firing is 22:00 local; in winter (CST, UTC-6)
// the 04:00 firing is 22:00 local. The other firing must NOT be 22:00.
// -----------------------------------------------------------------------------
test('chicagoDateHour resolves 22:00 for the summer (CDT) 03:00 UTC firing', () => {
  // 2026-07-15 03:00 UTC. July is CDT (UTC-5) -> 22:00 on 2026-07-14.
  assert.deepEqual(chicagoDateHour(new Date('2026-07-15T03:00:00Z')), {
    date: '2026-07-14',
    hour: 22,
  });
  // The 04:00 UTC firing that same night is 23:00 local -> guard skips it.
  assert.equal(chicagoDateHour(new Date('2026-07-15T04:00:00Z')).hour, 23);
});

test('chicagoDateHour resolves 22:00 for the winter (CST) 04:00 UTC firing', () => {
  // 2026-01-15 04:00 UTC. January is CST (UTC-6) -> 22:00 on 2026-01-14.
  assert.deepEqual(chicagoDateHour(new Date('2026-01-15T04:00:00Z')), {
    date: '2026-01-14',
    hour: 22,
  });
  // The 03:00 UTC firing that same night is 21:00 local -> guard skips it.
  assert.equal(chicagoDateHour(new Date('2026-01-15T03:00:00Z')).hour, 21);
});

test('chicagoDateHour maps midnight to hour 0, not 24', () => {
  // 2026-07-15 05:00 UTC = 2026-07-15 00:00 CDT.
  assert.deepEqual(chicagoDateHour(new Date('2026-07-15T05:00:00Z')), {
    date: '2026-07-15',
    hour: 0,
  });
});

test('chicagoCalendarDate converts a UTC start to the Chicago civil date', () => {
  // A run at 2026-03-09 02:30 UTC is 2026-03-08 20:30 CST (before the DST jump).
  assert.equal(chicagoCalendarDate('2026-03-09T02:30:00Z'), '2026-03-08');
  assert.equal(chicagoCalendarDate('2026-07-14T18:00:00Z'), '2026-07-14');
  assert.equal(chicagoCalendarDate(null), null);
  assert.equal(chicagoCalendarDate('not-a-date'), null);
});

// -----------------------------------------------------------------------------
// Running-category session selection (runnable = not rest / strength; prefer
// primary when both slots qualify).
// -----------------------------------------------------------------------------
test('pickRunSession prefers the primary running session', () => {
  const s = pickRunSession([
    { id: 'sec', slot: 'secondary', category: 'easy_run' },
    { id: 'pri', slot: 'primary', category: 'long_run' },
  ]);
  assert.equal(s?.id, 'pri');
});

test('pickRunSession falls back to a runnable secondary when primary is not runnable', () => {
  const s = pickRunSession([
    { id: 'pri', slot: 'primary', category: 'strength_only' },
    { id: 'sec', slot: 'secondary', category: 'easy_run' },
  ]);
  assert.equal(s?.id, 'sec');
});

test('pickRunSession returns null when the day has only rest/strength sessions', () => {
  assert.equal(
    pickRunSession([
      { id: 'a', slot: 'primary', category: 'strength_only' },
      { id: 'b', slot: 'secondary', category: 'rest' },
    ]),
    null,
  );
});

test('pickRunSession treats bike as runnable (neither rest nor strength)', () => {
  const s = pickRunSession([{ id: 'bike', slot: 'primary', category: 'bike' }]);
  assert.equal(s?.id, 'bike');
});

// -----------------------------------------------------------------------------
// runAutoLink against an in-memory fake Supabase client. runStravaSync runs
// first; with no Strava env configured it returns not_configured without any
// network or client use, so these tests exercise the linking logic in isolation.
// -----------------------------------------------------------------------------

interface Store {
  plans: Array<Record<string, unknown>>;
  plan_days: Array<Record<string, unknown>>;
  day_sessions: Array<Record<string, unknown>>;
  strava_activities: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
}

class FakeQuery {
  private eqs: Array<[string, unknown]> = [];
  private notNull: string[] = [];
  private op: 'select' | 'upsert' = 'select';
  private payload: Record<string, unknown> | null = null;
  private opts: { ignoreDuplicates?: boolean } = {};

  constructor(private store: Store, private table: keyof Store) {}

  select(): this {
    return this;
  }
  eq(col: string, val: unknown): this {
    this.eqs.push([col, val]);
    return this;
  }
  not(col: string): this {
    this.notNull.push(col);
    return this;
  }
  upsert(row: Record<string, unknown>, opts: { ignoreDuplicates?: boolean }): this {
    this.op = 'upsert';
    this.payload = row;
    this.opts = opts;
    return this;
  }

  private rows(): Array<Record<string, unknown>> {
    let rows = this.store[this.table] as Array<Record<string, unknown>>;
    for (const [c, v] of this.eqs) rows = rows.filter((r) => r[c] === v);
    for (const c of this.notNull) rows = rows.filter((r) => r[c] != null);
    return rows;
  }

  async maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: null }> {
    return { data: this.rows()[0] ?? null, error: null };
  }

  then(
    resolve: (v: { data: Array<Record<string, unknown>>; error: null }) => void,
  ): void {
    if (this.op === 'upsert' && this.payload) {
      const { plan_day_id, strava_activity_id } = this.payload;
      const dup = this.store.links.some(
        (l) => l.plan_day_id === plan_day_id && l.strava_activity_id === strava_activity_id,
      );
      if (dup && this.opts.ignoreDuplicates) {
        resolve({ data: [], error: null });
        return;
      }
      const rec = { id: `link-${this.store.links.length + 1}`, ...this.payload };
      this.store.links.push(rec);
      resolve({ data: [{ id: rec.id }], error: null });
      return;
    }
    resolve({ data: this.rows(), error: null });
  }
}

function fakeClient(store: Store): TypedSupabaseClient {
  return {
    from(table: keyof Store) {
      return new FakeQuery(store, table);
    },
  } as unknown as TypedSupabaseClient;
}

function baseStore(overrides: Partial<Store> = {}): Store {
  return {
    plans: [{ id: 'plan-1', slug: 'baystate-2026' }],
    plan_days: [{ id: 'day-1', plan_id: 'plan-1', date: '2026-07-14' }],
    day_sessions: [{ id: 'sess-1', plan_day_id: 'day-1', slot: 'primary', category: 'easy_run' }],
    strava_activities: [
      { id: 'act-1', sport_type: 'Run', start_date: '2026-07-14T18:00:00Z' },
    ],
    links: [],
    ...overrides,
  };
}

// 2026-07-15 03:00 UTC = 2026-07-14 22:00 CDT (the target Chicago day 2026-07-14).
const AT_2200 = new Date('2026-07-15T03:00:00Z');

test('runAutoLink links a run to the day running session (on-plan)', async () => {
  const store = baseStore();
  const summary = await runAutoLink(fakeClient(store), { now: AT_2200 });
  assert.equal(summary.date, '2026-07-14');
  assert.equal(summary.considered, 1);
  assert.equal(summary.linked, 1);
  assert.equal(summary.offPlan, 0);
  assert.equal(store.links.length, 1);
  assert.equal(store.links[0].day_session_id, 'sess-1');
  assert.equal(store.links[0].plan_day_id, 'day-1');
});

test('runAutoLink is idempotent: a second run links 0 new', async () => {
  const store = baseStore();
  const client = fakeClient(store);
  await runAutoLink(client, { now: AT_2200 });
  const second = await runAutoLink(client, { now: AT_2200 });
  assert.equal(second.linked, 0);
  assert.equal(second.skippedExisting, 1);
  assert.equal(store.links.length, 1);
});

test('runAutoLink falls back to a day-level (off-plan) link on a non-running day', async () => {
  const store = baseStore({
    day_sessions: [
      { id: 'strength', plan_day_id: 'day-1', slot: 'primary', category: 'strength_only' },
    ],
  });
  const summary = await runAutoLink(fakeClient(store), { now: AT_2200 });
  assert.equal(summary.linked, 1);
  assert.equal(summary.offPlan, 1);
  assert.equal(store.links.length, 1);
  // Off-plan link: day_session_id is null (never marks the strength session done).
  assert.equal(store.links[0].day_session_id, null);
  assert.equal(store.links[0].plan_day_id, 'day-1');
});

test('runAutoLink skips linking outside 22:00 Chicago unless forced', async () => {
  const store = baseStore();
  // 2026-07-15 04:00 UTC = 23:00 CDT -> not the link hour.
  const summary = await runAutoLink(fakeClient(store), {
    now: new Date('2026-07-15T04:00:00Z'),
  });
  assert.equal(summary.skipped, true);
  assert.equal(summary.linked, 0);
  assert.equal(store.links.length, 0);
  assert.equal(AUTO_LINK_HOUR, 22);
});

test('runAutoLink force bypasses the hour guard', async () => {
  const store = baseStore();
  const summary = await runAutoLink(fakeClient(store), {
    now: new Date('2026-07-15T04:00:00Z'),
    force: true,
  });
  assert.notEqual(summary.skipped, true);
  assert.equal(summary.linked, 1);
});

test('runAutoLink reports no plan day when the Chicago date is not in the plan', async () => {
  const store = baseStore({ plan_days: [{ id: 'day-x', plan_id: 'plan-1', date: '2026-01-01' }] });
  const summary = await runAutoLink(fakeClient(store), { now: AT_2200, force: true });
  assert.equal(summary.reason, 'no plan day');
  assert.equal(summary.linked, 0);
});

test('runAutoLink ignores non-run activities and other days', async () => {
  const store = baseStore({
    strava_activities: [
      { id: 'ride', sport_type: 'Ride', start_date: '2026-07-14T18:00:00Z' },
      { id: 'other-day', sport_type: 'Run', start_date: '2026-07-10T18:00:00Z' },
    ],
  });
  const summary = await runAutoLink(fakeClient(store), { now: AT_2200 });
  assert.equal(summary.considered, 0);
  assert.equal(summary.linked, 0);
});
