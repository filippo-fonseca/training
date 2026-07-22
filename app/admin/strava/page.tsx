import Link from 'next/link';
import type { Metadata } from 'next';
import { requireOwner } from '@/lib/auth/owner';
import { createServerSupabaseClient } from '@/lib/auth/server';
import { PageHeader } from '@/components/admin/page-header';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import type { StravaActivity, StravaConnection } from '@/lib/types/database';
import { getConnection, getActivities, isStravaConfigured } from '@/lib/strava';
import { isRunSport } from '@/lib/strava/match';
import { englishTitle } from '@/lib/strava/title';
import { DEFAULT_PLAN_SLUG } from '@/lib/db/queries';
import { linkActivity, unlinkActivity, disconnect } from './actions';
import { SyncNowButton } from './_components/sync-now';
import { AutoLinkButton } from './_components/auto-link';
import { staggerStyle } from '@/lib/design/motion';

export const metadata: Metadata = {
  title: 'Strava · Admin',
  robots: { index: false, follow: false },
};

interface PlanDayLite {
  id: string;
  date: string;
  weekday: string | null;
}

interface StravaData {
  supabaseReady: boolean;
  configured: boolean;
  connection: StravaConnection | null;
  activities: StravaActivity[];
  days: PlanDayLite[];
}

async function loadData(): Promise<StravaData> {
  const configured = isStravaConfigured();
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseReady) {
    return { supabaseReady: false, configured, connection: null, activities: [], days: [] };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const [connection, activities] = await Promise.all([
      getConnection(supabase).catch(() => null),
      getActivities(supabase).catch(() => [] as StravaActivity[]),
    ]);

    let days: PlanDayLite[] = [];
    const { data: plan } = await supabase
      .from('plans')
      .select('id')
      .eq('slug', DEFAULT_PLAN_SLUG)
      .maybeSingle();
    if (plan) {
      const { data: dayRows } = await supabase
        .from('plan_days')
        .select('id, date, weekday')
        .eq('plan_id', plan.id)
        .order('date', { ascending: true });
      days = dayRows ?? [];
    }
    return { supabaseReady: true, configured, connection, activities, days };
  } catch {
    return { supabaseReady: true, configured, connection: null, activities: [], days: [] };
  }
}

// -- formatting -------------------------------------------------------------
function km(m: number | null): string {
  if (m == null) return '--';
  return `${(m / 1000).toFixed(1)} km`;
}
function durationText(s: number | null): string {
  if (s == null) return '--';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function paceText(a: StravaActivity): string | null {
  if (!a.average_speed || a.average_speed <= 0) return null;
  const secPerKm = 1000 / a.average_speed;
  const m = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${m}:${String(sec).padStart(2, '0')}/km`;
}
function hrText(a: StravaActivity): string | null {
  return a.average_heartrate != null ? `${Math.round(a.average_heartrate)} bpm` : null;
}
function activityDate(a: StravaActivity): string {
  if (!a.start_date) return '--';
  return new Date(a.start_date).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Hand the matched activity to the session logger as a prefilled draft. */
function logDraftHref(a: StravaActivity, planDayId: string): string {
  const p = new URLSearchParams({ planDayId, from: 'strava' });
  if (a.distance_m != null) p.set('distance_km', (a.distance_m / 1000).toFixed(2));
  if (a.moving_time_s != null) p.set('duration_min', String(Math.round(a.moving_time_s / 60)));
  const pace = paceText(a);
  if (pace) p.set('pace', pace);
  if (a.average_heartrate != null) p.set('hr', String(Math.round(a.average_heartrate)));
  return `/admin/log?${p.toString()}`;
}

function ErrorBanner({ code }: { code: string }) {
  const MESSAGES: Record<string, string> = {
    not_configured: 'Strava is not configured on this deployment.',
    access_denied: 'Authorization was declined on Strava.',
    state_mismatch: 'The sign-in link expired or did not match. Please try connecting again.',
    exchange_failed: 'Could not complete the Strava connection. Please try again.',
  };
  return (
    <div
      className="mb-4 rounded-lg border border-sd-line bg-sd-box px-4 py-3 text-sm text-sd-ink-dull"
      role="alert"
    >
      {MESSAGES[code] ?? 'Something went wrong connecting Strava.'}
    </div>
  );
}

function ActivityMeta({ a }: { a: StravaActivity }) {
  const bits = [km(a.distance_m), durationText(a.moving_time_s), paceText(a), hrText(a)].filter(
    Boolean,
  );
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-tiny text-sd-ink-faint">
      <span className="sd-numeral">{activityDate(a)}</span>
      {bits.map((b, i) => (
        <span key={i} className="sd-numeral">
          {b}
        </span>
      ))}
      <span className="uppercase tracking-wide">{a.sport_type ?? 'activity'}</span>
    </div>
  );
}

export default async function StravaAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const sp = await searchParams;
  const errorCode = typeof sp.error === 'string' ? sp.error : null;
  const justConnected = sp.connected === '1';

  const { supabaseReady, configured, connection, activities, days } = await loadData();
  const dayById = new Map(days.map((d) => [d.id, d]));
  // Runs only (D11): the matched/unmatched lists show run-family activities.
  const runActivities = activities.filter((a) => isRunSport(a.sport_type));
  const matched = runActivities.filter((a) => a.plan_day_id);
  const unmatched = runActivities.filter((a) => !a.plan_day_id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Strava"
        description="Connect your Strava account to pull activities and match them to plan days. Tokens are stored server-side and are owner-only."
        actions={
          connection ? <StatusPill tone="synced" label="Connected" /> : <StatusPill tone="idle" label="Not connected" />
        }
      />

      {errorCode ? <ErrorBanner code={errorCode} /> : null}
      {justConnected ? (
        <div
          className="mb-4 rounded-lg border border-sd-line bg-sd-box px-4 py-3 text-sm text-sd-ink-dull"
          role="status"
        >
          Strava connected. Use “Sync now” to pull your recent activities.
        </div>
      ) : null}

      {/* --- Not-configured setup state -------------------------------------- */}
      {!supabaseReady || !configured ? (
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-sd-ink">Setup required</h2>
          <p className="mt-1 text-sm text-sd-ink-dull">
            {!supabaseReady
              ? 'Supabase is not configured, so Strava data cannot be stored yet.'
              : 'Add the Strava credentials to enable the connection. The client secret is kept server-side only.'}
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-sd-ink-faint">
            <li>
              <code className="sd-numeral">STRAVA_CLIENT_ID</code> and{' '}
              <code className="sd-numeral">STRAVA_CLIENT_SECRET</code>, from your Strava API app
            </li>
            <li>
              <code className="sd-numeral">CRON_SECRET</code>: bearer token for the daily sync route
            </li>
            <li>
              <code className="sd-numeral">SUPABASE_SERVICE_ROLE_KEY</code>: server-only; lets the
              scheduled cron write activities without an owner session
            </li>
            <li>
              Optional <code className="sd-numeral">STRAVA_REDIRECT_URI</code>: defaults to{' '}
              <code className="sd-numeral">&lt;origin&gt;/api/strava/callback</code> (works with
              localhost)
            </li>
          </ul>
          <p className="mt-3 text-xs text-sd-ink-faint">
            See <code className="sd-numeral">docs/strava.md</code> for the full setup, including the
            Strava app callback domain.
          </p>
        </Panel>
      ) : !connection ? (
        /* --- Configured but not connected -------------------------------- */
        <Panel className="p-5">
          <h2 className="text-sm font-semibold text-sd-ink">Connect Strava</h2>
          <p className="mt-1 max-w-prose text-sm text-sd-ink-dull">
            You’ll be sent to Strava to authorize read access to your activities
            (<code className="sd-numeral">activity:read_all</code>). Nothing is posted back to
            Strava.
          </p>
          <div className="mt-4">
            <a href="/api/strava/authorize" className="sd-btn sd-btn-primary">
              Connect Strava
            </a>
          </div>
        </Panel>
      ) : (
        /* --- Connected --------------------------------------------------- */
        <div className="space-y-6">
          <Panel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-sd-ink">Connection</h2>
                <dl className="mt-2 space-y-1 text-xs text-sd-ink-faint">
                  <div className="flex gap-2">
                    <dt className="w-24 sd-stat-label">Athlete</dt>
                    <dd className="sd-numeral text-sd-ink-dull">
                      {connection.strava_athlete_id ?? '--'}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 sd-stat-label">Scope</dt>
                    <dd className="text-sd-ink-dull">{connection.scope ?? '--'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 sd-stat-label">Activities</dt>
                    <dd className="text-sd-ink-dull">
                      <span className="sd-numeral">{runActivities.length}</span>
                      <span className="ml-2 text-tiny uppercase tracking-wide text-sd-ink-faint">
                        runs only
                      </span>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 sd-stat-label">Updated</dt>
                    <dd className="sd-numeral text-sd-ink-dull">
                      {new Date(connection.updated_at).toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                <SyncNowButton />
                <AutoLinkButton />
                <div className="flex items-center gap-2">
                  <a href="/api/strava/authorize?relink=1" className="sd-btn sd-btn-quiet text-tiny">
                    Re-link
                  </a>
                  <form action={disconnect}>
                    <Button type="submit" variant="quiet" className="text-tiny">
                      Unlink
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </Panel>

          {/* Unmatched, needs manual linking */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-sd-ink">
              Unmatched{' '}
              <span className="sd-numeral text-sd-ink-faint">({unmatched.length})</span>
            </h2>
            {unmatched.length === 0 ? (
              <p className="text-xs text-sd-ink-faint">
                Every synced activity is matched to a plan day.
              </p>
            ) : (
              <div className="space-y-2">
                {unmatched.map((a, i) => (
                  <Panel key={a.id} className="sd-enter p-4" style={staggerStyle(i)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-sd-ink">{englishTitle(a.name) ?? 'Activity'}</p>
                        <ActivityMeta a={a} />
                      </div>
                      <form action={linkActivity} className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <input type="hidden" name="activity_id" value={a.id} />
                        <select
                          name="plan_day_id"
                          required
                          defaultValue=""
                          className="w-full min-w-0 rounded-sd-chrome border border-sd-line bg-sd-input px-2 py-2 text-tiny text-sd-ink transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--sd-accent)_28%,var(--sd-line))] sm:w-auto"
                        >
                          <option value="" disabled>
                            Link to day…
                          </option>
                          {days.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.date}
                              {d.weekday ? ` · ${d.weekday}` : ''}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" variant="ghost" className="text-tiny">
                          Link
                        </Button>
                      </form>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </section>

          {/* Matched */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-sd-ink">
              Matched <span className="sd-numeral text-sd-ink-faint">({matched.length})</span>
            </h2>
            {matched.length === 0 ? (
              <p className="text-xs text-sd-ink-faint">Nothing matched yet. Try “Sync now”.</p>
            ) : (
              <div className="space-y-2">
                {matched.map((a, i) => {
                  const day = a.plan_day_id ? dayById.get(a.plan_day_id) : undefined;
                  return (
                    <Panel key={a.id} className="sd-enter p-4" style={staggerStyle(i)}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-sd-ink">{englishTitle(a.name) ?? 'Activity'}</p>
                          <ActivityMeta a={a} />
                          {day ? (
                            <p className="mt-1 text-tiny text-sd-ink-faint">
                              Matched to <span className="sd-numeral">{day.date}</span>
                              {day.weekday ? ` · ${day.weekday}` : ''}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {a.plan_day_id ? (
                            <Link
                              href={logDraftHref(a, a.plan_day_id)}
                              className="sd-btn sd-btn-ghost text-tiny"
                            >
                              Log draft
                            </Link>
                          ) : null}
                          <form action={unlinkActivity}>
                            <input type="hidden" name="activity_id" value={a.id} />
                            <Button type="submit" variant="quiet" className="text-tiny">
                              Unlink
                            </Button>
                          </form>
                        </div>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
