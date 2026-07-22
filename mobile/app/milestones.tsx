import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchJson } from '@/lib/api';
import { alpha, colors, spacing, typography } from '@/lib/theme';

type MilestonesData = {
  entries: TimelineEntry[];
  todayIso: string;
  fromFixture: boolean;
};

type TimelineEntry = {
  key: string;
  kind: 'milestone' | 'checkpoint';
  title: string;
  date: string | null;
  dateLabel: string;
  status: 'passed' | 'current' | 'upcoming';
  isRace: boolean;
  description: string | null;
  weekNumber: number | null;
  green: string | null;
  yellow: string | null;
  red: string | null;
};

export default function MilestonesScreen() {
  const [data, setData] = useState<MilestonesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchJson<MilestonesData>('/api/mobile/milestones'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load milestones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      title="Milestones"
      eyebrow="Journey"
      subtitle="Decision checkpoints and race-critical markers."
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
            <View style={styles.header}>
              <StatLabel>Timeline</StatLabel>
              <StatusPill label={data.fromFixture ? 'Fixture' : 'Live'} tone={data.fromFixture ? 'amber' : 'sage'} />
            </View>
            {data.entries.length === 0 ? <Text style={styles.body}>No milestones yet.</Text> : null}
            {data.entries.map((entry, index) => (
              <TimelineItem key={entry.key} entry={entry} isLast={index === data.entries.length - 1} />
            ))}
          </View>
        </Panel>
      ) : !loading ? (
        <Panel>
          <Text style={styles.body}>No milestones are available yet.</Text>
        </Panel>
      ) : null}
    </Screen>
  );
}

function TimelineItem({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const tone = entry.isRace
    ? colors.coral
    : entry.status === 'current'
      ? colors.accent
      : entry.status === 'passed'
        ? colors.sage
        : colors.inkFaint;
  return (
    <View style={styles.item}>
      <View style={styles.rail}>
        <View style={[styles.node, { backgroundColor: tone }]} />
        {!isLast ? <View style={styles.connector} /> : null}
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <StatusPill
            label={entry.isRace ? 'Race' : entry.kind}
            tone={entry.isRace ? 'coral' : entry.status === 'upcoming' ? 'muted' : 'accent'}
          />
          <Text style={styles.date}>{entry.dateLabel}</Text>
        </View>
        <Text style={[styles.title, entry.status === 'passed' && styles.passed]}>{entry.title}</Text>
        {entry.description ? <Text style={styles.body}>{entry.description}</Text> : null}
        {entry.green || entry.yellow || entry.red ? (
          <View style={styles.criteria}>
            {entry.green ? <Criteria label="Green" text={entry.green} color={colors.sage} /> : null}
            {entry.yellow ? <Criteria label="Yellow" text={entry.yellow} color={colors.amber} /> : null}
            {entry.red ? <Criteria label="Red" text={entry.red} color={colors.coral} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Criteria({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <View style={[styles.criterion, { borderColor: alpha(color, 0.34) }]}>
      <Text style={[styles.criteriaLabel, { color }]}>{label}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  item: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  rail: {
    alignItems: 'center',
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing[1],
  },
  connector: {
    width: 1,
    flex: 1,
    minHeight: 58,
    backgroundColor: colors.divider,
    marginTop: spacing[2],
  },
  itemBody: {
    flex: 1,
    gap: spacing[2],
    paddingBottom: spacing[4],
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  title: {
    ...typography.h2,
  },
  passed: {
    color: colors.inkDull,
  },
  date: {
    ...typography.small,
  },
  body: {
    ...typography.body,
  },
  criteria: {
    gap: spacing[2],
  },
  criterion: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[3],
    gap: spacing[1],
    backgroundColor: colors.darkBox,
  },
  criteriaLabel: {
    ...typography.monoLabel,
  },
});
