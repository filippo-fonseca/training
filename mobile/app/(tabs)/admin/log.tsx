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
import { supabase } from '@/lib/supabase';
import { km, spacing, typography } from '@/lib/theme';

type DashboardToday = {
  data?: {
    todayISO?: string;
  };
};

type DayData = {
  plan: { id: string };
  day: { id: string; date: string; weekday: string | null };
  primary: {
    title: string | null;
    distance_km: number | null;
    pace_text: string | null;
    rpe_text: string | null;
  } | null;
  log: {
    completed: boolean;
    actual_distance_km: number | null;
  } | null;
};

export default function LogScreen() {
  const router = useRouter();
  const { isOwner } = useAuth();
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dashboard = await fetchJson<DashboardToday>('/api/mobile/dashboard');
      const today = dashboard.data?.todayISO ?? new Date().toISOString().slice(0, 10);
      setData(await fetchJson<DayData>(`/api/mobile/day?date=${today}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load today.');
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleCompleted() {
    if (!data) return;
    setSaving(true);
    setError(null);
    const nextCompleted = !data.log?.completed;
    const { error: writeError } = await supabase
      .from('session_logs')
      .upsert(
        {
          plan_id: data.plan.id,
          plan_day_id: data.day.id,
          logged_at: new Date().toISOString(),
          completed: nextCompleted,
          actual_distance_km: nextCompleted ? data.primary?.distance_km ?? null : null,
          actual_pace_text: nextCompleted ? data.primary?.pace_text ?? null : null,
          actual_rpe: nextCompleted ? parseRpe(data.primary?.rpe_text) : null,
          notes: 'Updated from The Comeback mobile app.',
        },
        { onConflict: 'plan_day_id' },
      );
    setSaving(false);
    if (writeError) {
      setError(writeError.message);
      return;
    }
    await load();
  }

  if (!isOwner) {
    return (
      <Screen title="Log today" eyebrow="Admin" subtitle="Owner session required.">
        <Panel>
          <View style={styles.stack}>
            <StatusPill label="Signed out" tone="amber" />
            <Text style={styles.body}>Sign in to write session logs.</Text>
            <Button title="Sign in" onPress={() => router.push('/login')} />
          </View>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen
      title="Log today"
      eyebrow="Admin"
      subtitle="A quick completion toggle for the current plan day."
      refreshing={loading}
      onRefresh={load}
    >
      {error ? (
        <Panel>
          <Text style={styles.body}>{error}</Text>
        </Panel>
      ) : null}
      {data ? (
        <Panel>
          <View style={styles.stack}>
            <StatusPill label={data.log?.completed ? 'Completed' : 'Open'} tone={data.log?.completed ? 'sage' : 'accent'} />
            <StatLabel>{data.day.weekday ?? data.day.date}</StatLabel>
            <Text style={styles.title}>{data.primary?.title ?? 'Nothing planned'}</Text>
            <Text style={styles.body}>
              Planned {km(data.primary?.distance_km)} · Pace {data.primary?.pace_text ?? '--'} · RPE{' '}
              {data.primary?.rpe_text ?? '--'}
            </Text>
            <Button
              title={data.log?.completed ? 'Mark not completed' : 'Mark completed'}
              loading={saving}
              onPress={toggleCompleted}
            />
            <Text style={styles.body}>
              Full CRUD stays on the web admin for detailed modifications, shoes, and notes.
            </Text>
          </View>
        </Panel>
      ) : !loading ? (
        <Panel>
          <Text style={styles.body}>No plan day is available for today.</Text>
        </Panel>
      ) : null}
    </Screen>
  );
}

function parseRpe(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[3],
  },
  title: {
    ...typography.h2,
  },
  body: {
    ...typography.body,
  },
});
