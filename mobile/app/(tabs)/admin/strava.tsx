import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchJson } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing, typography } from '@/lib/theme';

WebBrowser.maybeCompleteAuthSession();

type StravaStatus = {
  configured: boolean;
  connected: boolean;
  athleteId?: number | string | null;
  scope?: string | null;
  updatedAt?: string | null;
  activityCount?: number;
};

type AuthorizeResponse = {
  authorizeUrl: string;
  state?: string;
};

export default function StravaScreen() {
  const router = useRouter();
  const { token, isOwner } = useAuth();
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchJson<StravaStatus>('/api/mobile/strava/status', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Strava status.');
    } finally {
      setLoading(false);
    }
  }, [isOwner, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      setMessage(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed.`);
    } finally {
      setBusy(null);
    }
  }

  if (!isOwner || !token) {
    return (
      <Screen title="Strava" eyebrow="Admin" subtitle="Owner session required.">
        <Panel>
          <View style={styles.stack}>
            <StatusPill label="Signed out" tone="amber" />
            <Text style={styles.body}>Sign in to manage the Strava connection.</Text>
            <Button title="Sign in" onPress={() => router.push('/login')} />
          </View>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen
      title="Strava"
      eyebrow="Admin"
      subtitle="Connect, sync, and auto-link verified runs."
      refreshing={loading}
      onRefresh={load}
    >
      <Panel>
        <View style={styles.stack}>
          <View style={styles.header}>
            <StatLabel>Status</StatLabel>
            <StatusPill
              label={!status?.configured ? 'Not configured' : status.connected ? 'Connected' : 'Disconnected'}
              tone={!status?.configured ? 'amber' : status.connected ? 'sage' : 'muted'}
            />
          </View>
          <Text style={styles.body}>
            Athlete {status?.athleteId ?? '--'} · {status?.activityCount ?? 0} activities · Scope{' '}
            {status?.scope ?? '--'}
          </Text>
          {status?.updatedAt ? <Text style={styles.body}>Updated {status.updatedAt}</Text> : null}
        </View>
      </Panel>
      {error ? (
        <Panel>
          <Text style={styles.error}>{error}</Text>
        </Panel>
      ) : null}
      {message ? (
        <Panel>
          <Text style={styles.mono}>{message}</Text>
        </Panel>
      ) : null}
      <Panel>
        <View style={styles.stack}>
          <Button
            title="Connect Strava"
            loading={busy === 'connect'}
            disabled={!status?.configured}
            onPress={() =>
              runAction('connect', async () => {
                const auth = await fetchJson<AuthorizeResponse>('/api/mobile/strava/authorize', { token });
                const result = await WebBrowser.openAuthSessionAsync(auth.authorizeUrl, 'comeback://strava');
                return result.type === 'success' ? 'Strava authorization returned to the app.' : `Auth ${result.type}.`;
              })
            }
          />
          <Button
            title="Sync activities"
            variant="quiet"
            loading={busy === 'sync'}
            onPress={() => runAction('sync', () => fetchJson('/api/mobile/strava/sync', { token, method: 'POST' }))}
          />
          <Button
            title="Auto-link today"
            variant="quiet"
            loading={busy === 'auto-link'}
            onPress={() =>
              runAction('auto-link', () =>
                fetchJson('/api/mobile/strava/auto-link', { token, method: 'POST' }),
              )
            }
          />
          <Button
            title="Disconnect"
            variant="ghost"
            loading={busy === 'disconnect'}
            onPress={() =>
              runAction('disconnect', () =>
                fetchJson('/api/mobile/strava/disconnect', { token, method: 'DELETE' }),
              )
            }
          />
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  body: {
    ...typography.body,
  },
  error: {
    ...typography.body,
    color: colors.coral,
  },
  mono: {
    color: colors.inkDull,
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    lineHeight: 18,
  },
});
