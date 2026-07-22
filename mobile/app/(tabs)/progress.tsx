import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchJson } from '@/lib/api';
import { alpha, colors, fonts, km, spacing, typography } from '@/lib/theme';

type ProgressData = {
  weekly: WeeklyKm[];
  summary: {
    totalPlannedKm: number;
    totalActualKm: number;
    onPlanRate: number;
    loggedSessions: number;
    totalSessions: number;
    weeksElapsed: number;
    totalWeeks: number;
  };
  currentWeek: number | null;
  fromFixture: boolean;
};

type WeeklyKm = {
  weekIndex: number;
  phaseLabel: string | null;
  plannedKm: number;
  actualKm: number | null;
  rangeMinKm?: number | null;
  rangeMaxKm?: number | null;
  isCutback: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  isPeak: boolean;
};

export default function ProgressScreen() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchJson<ProgressData>('/api/mobile/progress'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load progress.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      title="Progress"
      eyebrow="Plan trajectory"
      subtitle="Weekly volume against the prescribed build."
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
          <Panel>
            <View style={styles.stack}>
              <View style={styles.header}>
                <View>
                  <StatLabel>Keeping up</StatLabel>
                  <Text style={styles.big}>{Math.round(data.summary.onPlanRate * 100)}%</Text>
                </View>
                <StatusPill label={data.fromFixture ? 'Fixture' : 'Live'} tone={data.fromFixture ? 'amber' : 'sage'} />
              </View>
              <Text style={styles.body}>
                {km(data.summary.totalActualKm, '0 km')} logged of {km(data.summary.totalPlannedKm)} planned ·{' '}
                {data.summary.loggedSessions}/{data.summary.totalSessions} sessions.
              </Text>
            </View>
          </Panel>
          <Panel>
            <View style={styles.stack}>
              <StatLabel>Weekly bars</StatLabel>
              {data.weekly.length === 0 ? <Text style={styles.body}>No weekly data yet.</Text> : null}
              {data.weekly.map((week) => (
                <WeekBar
                  key={week.weekIndex}
                  week={week}
                  active={week.weekIndex === data.currentWeek}
                />
              ))}
            </View>
          </Panel>
        </>
      ) : !loading ? (
        <Panel>
          <Text style={styles.body}>No progress data yet.</Text>
        </Panel>
      ) : null}
    </Screen>
  );
}

function WeekBar({ week, active }: { week: WeeklyKm; active: boolean }) {
  const planned = Math.max(week.plannedKm, week.rangeMaxKm ?? 0, 1);
  const actualPct = Math.max(0, Math.min(1, (week.actualKm ?? 0) / planned));
  const plannedPct = Math.max(0, Math.min(1, week.plannedKm / planned));
  const tone = week.isRaceWeek ? colors.coral : week.isPeak ? colors.amber : colors.accent;

  return (
    <View style={[styles.week, active && styles.activeWeek]}>
      <View style={styles.weekTop}>
        <Text style={styles.weekLabel}>W{week.weekIndex}</Text>
        <Text style={styles.weekPhase}>{week.phaseLabel ?? phaseFallback(week)}</Text>
        <Text style={styles.weekKm}>
          {week.actualKm == null ? '--' : km(week.actualKm)} / {km(week.plannedKm)}
        </Text>
      </View>
      <View style={styles.rail}>
        <View style={[styles.plannedFill, { width: `${plannedPct * 100}%` }]} />
        <View style={[styles.actualFill, { width: `${actualPct * 100}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

function phaseFallback(week: WeeklyKm): string {
  if (week.isRaceWeek) return 'Race week';
  if (week.isTaper) return 'Taper';
  if (week.isCutback) return 'Cutback';
  return 'Build';
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
  big: {
    color: colors.ink,
    fontFamily: fonts.monoBold,
    fontSize: 40,
    letterSpacing: -2,
    marginTop: spacing[1],
  },
  body: {
    ...typography.body,
  },
  week: {
    gap: spacing[2],
  },
  activeWeek: {
    backgroundColor: alpha(colors.accent, 0.07),
    borderRadius: 8,
    padding: spacing[2],
    marginHorizontal: -spacing[2],
  },
  weekTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  weekLabel: {
    width: 30,
    color: colors.ink,
    fontFamily: fonts.monoBold,
    fontSize: 12,
  },
  weekPhase: {
    flex: 1,
    color: colors.inkDull,
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  weekKm: {
    color: colors.inkFaint,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  rail: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.darkBox,
  },
  plannedFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.line,
  },
  actualFill: {
    height: '100%',
    borderRadius: 999,
  },
});
