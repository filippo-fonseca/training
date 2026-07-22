import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchJson } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, typography } from '@/lib/theme';

type TrafficLight = 'green' | 'yellow' | 'red';

type DashboardToday = {
  data?: { todayISO?: string };
};

type DayData = {
  plan: { id: string };
  day: { id: string; date: string; weekday: string | null };
};

export default function HealthScreen() {
  const router = useRouter();
  const { isOwner } = useAuth();
  const [day, setDay] = useState<DayData | null>(null);
  const [trafficLight, setTrafficLight] = useState<TrafficLight>('green');
  const [kneeBefore, setKneeBefore] = useState('');
  const [energy, setEnergy] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
      setDay(await fetchJson<DayData>(`/api/mobile/day?date=${today}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load today.');
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!day) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error: writeError } = await supabase
      .from('health_entries')
      .upsert(
        {
          plan_id: day.plan.id,
          plan_day_id: day.day.id,
          entry_date: day.day.date,
          traffic_light: trafficLight,
          knee_before: numberOrNull(kneeBefore),
          energy: energy.trim() || null,
          notes: notes.trim() || null,
        },
        { onConflict: 'plan_day_id' },
      );
    setSaving(false);
    if (writeError) {
      setError(writeError.message);
      return;
    }
    setMessage('Health note saved.');
  }

  if (!isOwner) {
    return (
      <Screen title="Health note" eyebrow="Admin" subtitle="Owner session required.">
        <Panel>
          <View style={styles.stack}>
            <StatusPill label="Signed out" tone="amber" />
            <Text style={styles.body}>Sign in to write private health entries.</Text>
            <Button title="Sign in" onPress={() => router.push('/login')} />
          </View>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen
      title="Health note"
      eyebrow="Admin"
      subtitle="Quick private check-in for today."
      refreshing={loading}
      onRefresh={load}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Panel>
          <View style={styles.stack}>
            <StatLabel>{day?.day.weekday ?? day?.day.date ?? 'Today'}</StatLabel>
            <Text style={styles.title}>Recovery check</Text>
            <TrafficPicker value={trafficLight} onChange={setTrafficLight} />
            <Field
              label="Knee before (0-10)"
              value={kneeBefore}
              onChangeText={setKneeBefore}
              keyboardType="number-pad"
              placeholder="0"
            />
            <Field
              label="Energy"
              value={energy}
              onChangeText={setEnergy}
              placeholder="steady, flat, sharp..."
            />
            <Field
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything worth remembering"
              multiline
              style={styles.notes}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.body}>{message}</Text> : null}
            <Button title="Save health note" loading={saving} disabled={!day} onPress={save} />
          </View>
        </Panel>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function TrafficPicker({
  value,
  onChange,
}: {
  value: TrafficLight;
  onChange: (value: TrafficLight) => void;
}) {
  return (
    <View style={styles.picker}>
      {(['green', 'yellow', 'red'] as const).map((item) => (
        <Button
          key={item}
          title={item}
          variant={value === item ? 'primary' : 'ghost'}
          style={styles.pickerButton}
          onPress={() => onChange(item)}
        />
      ))}
    </View>
  );
}

type FieldProps = ComponentProps<typeof TextInput> & {
  label: string;
};

function Field({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <StatLabel>{label}</StatLabel>
      <TextInput
        {...props}
        placeholderTextColor={colors.inkFaint}
        selectionColor={colors.accent}
        style={[styles.input, style]}
      />
    </View>
  );
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
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
  picker: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  pickerButton: {
    flex: 1,
  },
  field: {
    gap: spacing[2],
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.darkBox,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  notes: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.body,
    color: colors.coral,
  },
});
