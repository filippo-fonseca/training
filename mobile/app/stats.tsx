import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatRow } from '@/components/dashboard/StatRow';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchJson } from '@/lib/api';
import { alpha, colors, km, spacing, typography } from '@/lib/theme';

type StatsData = {
  summary: {
    totalPlannedKm: number;
    totalCompletedKm: number;
    sessionsPlanned: number;
    sessionsCompleted: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    daysUntilRace: number;
    weeksCompleted: number;
    totalWeeks: number;
    byType: { category: string; label: string; plannedKm: number }[];
    maxDayVolumeKm: number;
    anyLogged: boolean;
  };
  heatmap: HeatmapCell[];
  today: string;
  fromFixture: boolean;
};

type HeatmapCell = {
  date: string;
  plannedKm: number;
  completedKm: number;
  isRest: boolean;
  isRace: boolean;
  hasLog: boolean;
  offPlan: boolean;
};

export default function StatsScreen() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchJson<StatsData>('/api/mobile/stats'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      title="Stats"
      eyebrow="Public ledger"
      subtitle="Completion, streaks, and training distribution."
      refreshing={loading}
      onRefresh={load}
    >
      {error ? (
        <Panel>
          <Text style={styles.body}>{error}</Text>
        </Panel>
      ) : null}
      {data ? (
        <>
          <StatRow
            stats={[
              {
                label: 'Volume',
                value: km(data.summary.totalCompletedKm, '0 km'),
                caption: `${km(data.summary.totalPlannedKm)} planned`,
              },
              {
                label: 'Sessions',
                value: `${data.summary.sessionsCompleted}/${data.summary.sessionsPlanned}`,
                caption: `${Math.round(data.summary.completionRate * 100)}% complete`,
              },
              {
                label: 'Streak',
                value: data.summary.currentStreak,
                caption: `${data.summary.longestStreak} longest`,
              },
              {
                label: 'Race',
                value: data.summary.daysUntilRace,
                caption: 'days away',
              },
            ]}
          />
          <Panel>
            <View style={styles.stack}>
              <View style={styles.header}>
                <StatLabel>Heatmap</StatLabel>
                <StatusPill label={data.fromFixture ? 'Fixture' : 'Live'} tone={data.fromFixture ? 'amber' : 'sage'} />
              </View>
              <View style={styles.heatmap}>
                {data.heatmap.map((cell) => (
                  <View
                    key={cell.date}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: heatColor(cell, data.summary.maxDayVolumeKm),
                        borderColor: cell.date === data.today ? colors.accent : colors.divider,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.body}>
                {data.summary.weeksCompleted}/{data.summary.totalWeeks} weeks fully elapsed.
              </Text>
            </View>
          </Panel>
          <Panel>
            <View style={styles.stack}>
              <StatLabel>Planned type mix</StatLabel>
              {data.summary.byType.length === 0 ? <Text style={styles.body}>No type data yet.</Text> : null}
              {data.summary.byType.map((item) => (
                <View key={item.category} style={styles.typeRow}>
                  <Text style={styles.typeLabel}>{item.label}</Text>
                  <Text style={styles.typeValue}>{km(item.plannedKm)}</Text>
                </View>
              ))}
            </View>
          </Panel>
        </>
      ) : !loading ? (
        <Panel>
          <Text style={styles.body}>No stats are available yet.</Text>
        </Panel>
      ) : null}
    </Screen>
  );
}

function heatColor(cell: HeatmapCell, maxDayVolumeKm: number): string {
  if (cell.isRace) return alpha(colors.coral, 0.72);
  if (cell.hasLog) {
    const opacity = Math.max(0.25, Math.min(0.86, cell.completedKm / Math.max(maxDayVolumeKm, 1)));
    return alpha(colors.sage, opacity);
  }
  if (cell.offPlan) return alpha(colors.strava, 0.48);
  if (cell.isRest) return colors.darkBox;
  return alpha(colors.accent, cell.plannedKm > 0 ? 0.18 : 0.08);
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  body: {
    ...typography.body,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing[3],
    gap: spacing[3],
  },
  typeLabel: {
    ...typography.body,
    color: colors.ink,
  },
  typeValue: {
    ...typography.body,
    color: colors.inkDull,
  },
});
