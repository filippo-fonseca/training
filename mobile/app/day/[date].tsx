import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchJson } from '@/lib/api';
import { colors, km, spacing, typography } from '@/lib/theme';

type DayData = {
  day: {
    id: string;
    date: string;
    weekday: string | null;
    planned_run_km: number | null;
  };
  week: {
    week_index: number;
    phase_label: string | null;
  } | null;
  primary: Session | null;
  secondary: Session | null;
  alternatives: Alternative[];
  milestones: Milestone[];
  log: SessionLog | null;
  evidence: Evidence[];
  offPlan: boolean;
  status: 'planned' | 'logged' | 'missed' | 'alternative-used' | 'rest';
  prevDate: string | null;
  nextDate: string | null;
};

type Session = {
  title: string | null;
  category: string | null;
  distance_km: number | null;
  duration_text: string | null;
  pace_text: string | null;
  rpe_text: string | null;
  notes: string | null;
};

type Alternative = {
  title: string | null;
  description: string | null;
};

type Milestone = {
  title: string;
  description: string | null;
};

type SessionLog = {
  completed: boolean;
  actual_distance_km: number | null;
  actual_duration_min: number | null;
  actual_pace_text: string | null;
  notes: string | null;
};

type Evidence = {
  name: string | null;
  distanceM: number | null;
  movingTimeS: number | null;
  activityUrl: string;
};

export default function DayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchJson<DayData>(`/api/mobile/day?date=${encodeURIComponent(date)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load day.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      title={data?.primary?.title ?? data?.day.weekday ?? 'Day detail'}
      eyebrow={date ?? 'Plan day'}
      subtitle={data?.week ? `Week ${data.week.week_index} · ${data.week.phase_label ?? 'Training'}` : undefined}
      refreshing={loading}
      onRefresh={load}
    >
      <Stack.Screen options={{ title: date ?? 'Day detail' }} />
      {error ? (
        <Panel>
          <Text style={styles.body}>{error}</Text>
        </Panel>
      ) : null}
      {data ? (
        <>
          <Panel>
            <View style={styles.stack}>
              <StatusPill label={statusLabel(data.status, data.offPlan)} tone={statusTone(data.status, data.offPlan)} />
              <Text style={styles.title}>{data.primary?.title ?? 'Nothing planned'}</Text>
              <View style={styles.metrics}>
                <Metric label="Distance" value={km(data.primary?.distance_km ?? data.day.planned_run_km)} />
                <Metric label="Pace" value={data.primary?.pace_text ?? '--'} />
                <Metric label="RPE" value={data.primary?.rpe_text ?? '--'} />
              </View>
              {data.primary?.notes ? <Text style={styles.body}>{data.primary.notes}</Text> : null}
            </View>
          </Panel>
          {data.secondary ? (
            <InfoPanel label="Secondary" title={data.secondary.title ?? 'Secondary session'} body={data.secondary.notes} />
          ) : null}
          {data.alternatives.length > 0 ? (
            <Panel>
              <View style={styles.stack}>
                <StatLabel>Alternatives</StatLabel>
                {data.alternatives.map((alternative, index) => (
                  <View key={`${alternative.title ?? 'alternative'}-${index}`} style={styles.item}>
                    <Text style={styles.itemTitle}>{alternative.title ?? 'Alternative'}</Text>
                    {alternative.description ? <Text style={styles.body}>{alternative.description}</Text> : null}
                  </View>
                ))}
              </View>
            </Panel>
          ) : null}
          {data.milestones.length > 0 ? (
            <Panel>
              <View style={styles.stack}>
                <StatLabel>Milestones</StatLabel>
                {data.milestones.map((milestone) => (
                  <View key={milestone.title} style={styles.item}>
                    <Text style={styles.itemTitle}>{milestone.title}</Text>
                    {milestone.description ? <Text style={styles.body}>{milestone.description}</Text> : null}
                  </View>
                ))}
              </View>
            </Panel>
          ) : null}
          <EvidencePanel log={data.log} evidence={data.evidence} offPlan={data.offPlan} />
          <View style={styles.nav}>
            <Button
              title="Previous"
              variant="ghost"
              disabled={!data.prevDate}
              onPress={() => data.prevDate && router.push(`/day/${data.prevDate}` as Href)}
            />
            <Button
              title="Next"
              variant="ghost"
              disabled={!data.nextDate}
              onPress={() => data.nextDate && router.push(`/day/${data.nextDate}` as Href)}
            />
          </View>
        </>
      ) : !loading ? (
        <Panel>
          <Text style={styles.body}>No plan day was found for this date.</Text>
        </Panel>
      ) : null}
    </Screen>
  );
}

function EvidencePanel({
  log,
  evidence,
  offPlan,
}: {
  log: SessionLog | null;
  evidence: Evidence[];
  offPlan: boolean;
}) {
  return (
    <Panel>
      <View style={styles.stack}>
        <StatLabel>Evidence</StatLabel>
        {log ? (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{log.completed ? 'Manual log completed' : 'Manual log'}</Text>
            <Text style={styles.body}>
              {km(log.actual_distance_km)} · {log.actual_duration_min ?? '--'} min · {log.actual_pace_text ?? '--'}
            </Text>
            {log.notes ? <Text style={styles.body}>{log.notes}</Text> : null}
          </View>
        ) : null}
        {evidence.map((item) => (
          <View key={item.activityUrl} style={styles.item}>
            <Text style={styles.itemTitle}>{item.name ?? 'Strava activity'}</Text>
            <Text style={styles.body}>
              {km(metersToKm(item.distanceM))} · {secondsToMinutes(item.movingTimeS)} min
            </Text>
          </View>
        ))}
        {!log && evidence.length === 0 ? (
          <Text style={styles.body}>No manual log or Strava evidence yet.</Text>
        ) : null}
        {offPlan ? <StatusPill label="Off-plan evidence" tone="strava" /> : null}
      </View>
    </Panel>
  );
}

function InfoPanel({ label, title, body }: { label: string; title: string; body: string | null }) {
  return (
    <Panel>
      <View style={styles.stack}>
        <StatLabel>{label}</StatLabel>
        <Text style={styles.itemTitle}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <StatLabel>{label}</StatLabel>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function metersToKm(value: number | null): number | null {
  return value == null ? null : Math.round((value / 1000) * 10) / 10;
}

function secondsToMinutes(value: number | null): string {
  return value == null ? '--' : String(Math.round(value / 60));
}

function statusLabel(status: DayData['status'], offPlan: boolean): string {
  if (offPlan) return 'Off-plan';
  return status.replace(/-/g, ' ');
}

function statusTone(status: DayData['status'], offPlan: boolean) {
  if (offPlan) return 'strava' as const;
  if (status === 'logged' || status === 'alternative-used') return 'sage' as const;
  if (status === 'missed') return 'coral' as const;
  if (status === 'planned') return 'accent' as const;
  return 'muted' as const;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[3],
  },
  title: {
    ...typography.h1,
  },
  body: {
    ...typography.body,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  metric: {
    flex: 1,
    gap: spacing[1],
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.numeral.fontFamily,
    fontSize: 15,
  },
  item: {
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing[3],
  },
  itemTitle: {
    ...typography.h2,
    fontSize: 17,
    lineHeight: 22,
  },
  nav: {
    flexDirection: 'row',
    gap: spacing[3],
  },
});
