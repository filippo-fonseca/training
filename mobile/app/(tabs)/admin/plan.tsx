import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { km, spacing, typography } from '@/lib/theme';

type PlanRow = {
  id: string;
  slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  race_name: string | null;
  race_date: string | null;
  total_planned_km: number | null;
};

export default function PlanScreen() {
  const router = useRouter();
  const { isOwner } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: readError } = await supabase
      .from('plans')
      .select('id, slug, title, start_date, end_date, race_name, race_date, total_planned_km')
      .order('start_date', { ascending: true });
    if (readError) {
      setError(readError.message);
      setPlans([]);
    } else {
      setPlans((data ?? []) as PlanRow[]);
    }
    setLoading(false);
  }, [isOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isOwner) {
    return (
      <Screen title="Plan" eyebrow="Admin" subtitle="Owner session required.">
        <Panel>
          <View style={styles.stack}>
            <StatusPill label="Signed out" tone="amber" />
            <Text style={styles.body}>Sign in to read owner-gated plan rows.</Text>
            <Button title="Sign in" onPress={() => router.push('/login')} />
          </View>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen
      title="Plan"
      eyebrow="Admin"
      subtitle="Owner-readable Supabase plan records."
      refreshing={loading}
      onRefresh={load}
    >
      {error ? (
        <Panel>
          <Text style={styles.body}>{error}</Text>
        </Panel>
      ) : null}
      {plans.map((plan) => (
        <Panel key={plan.id}>
          <View style={styles.stack}>
            <StatLabel>{plan.slug}</StatLabel>
            <Text style={styles.title}>{plan.title}</Text>
            <Text style={styles.body}>
              {plan.start_date ?? '--'} to {plan.end_date ?? '--'} · {km(plan.total_planned_km)}
            </Text>
            <Text style={styles.body}>
              Race: {plan.race_name ?? '--'} · {plan.race_date ?? '--'}
            </Text>
          </View>
        </Panel>
      ))}
      {!loading && plans.length === 0 ? (
        <Panel>
          <Text style={styles.body}>No plans were returned for this session.</Text>
        </Panel>
      ) : null}
    </Screen>
  );
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
