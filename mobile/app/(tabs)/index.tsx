import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HeroCountdown, type Countdown } from '@/components/dashboard/HeroCountdown';
import { StatRow } from '@/components/dashboard/StatRow';
import { TodayCard, type Today } from '@/components/dashboard/TodayCard';
import { WeekGauge, type Week } from '@/components/dashboard/WeekGauge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { fetchJson } from '@/lib/api';
import { colors, km, spacing, typography } from '@/lib/theme';

type DashboardData = {
  source: 'live' | 'fixture';
  manifesto: string;
  est: string;
  wordmark: string;
  dayNumber: number;
  totalDays: number;
  countdown: Countdown;
  today: Today;
  spotlight: ActivityEvidence | null;
  week: Week;
  currentWeekIndex: number;
  stats: {
    completedKm: number;
    totalPlannedKm: number;
    sessionsCompleted: number;
    sessionsPlanned: number;
    completionPct: number;
    currentStreak: number;
    longestStreak: number;
    anyLogged: boolean;
  };
  nextMilestone: {
    title: string;
    dateShort: string | null;
    daysAway: number | null;
  } | null;
};

type ActivityEvidence = {
  name?: string | null;
  distanceM?: number | null;
  movingTimeS?: number | null;
  startDate?: string | null;
  activityUrl?: string | null;
};

type DashboardResponse = {
  data: DashboardData;
  recentVerified?: ActivityEvidence[];
};

export default function HomeScreen() {
  const [payload, setPayload] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchJson<DashboardResponse>('/api/mobile/dashboard'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const data = payload?.data ?? null;

  return (
    <Screen
      title={data?.wordmark ?? 'The Comeback'}
      eyebrow={data?.est ?? 'The Comeback'}
      subtitle={data?.manifesto ?? 'Rebuilding to the start line, one logged day at a time.'}
      refreshing={loading}
      onRefresh={load}
    >
      {error ? <ErrorPanel message={error} onRetry={load} /> : null}
      {!data && !error ? <LoadingPanel /> : null}
      {data ? (
        <>
          <HeroCountdown
            data={data.countdown}
            dayNumber={data.dayNumber}
            totalDays={data.totalDays}
          />
          <TodayCard data={data.today} />
          <WeekGauge data={data.week} weekIndex={data.currentWeekIndex} />
          <StatRow
            stats={[
              {
                label: 'Completed',
                value: km(data.stats.completedKm, '0 km'),
                caption: `${km(data.stats.totalPlannedKm)} planned`,
              },
              {
                label: 'Sessions',
                value: `${data.stats.sessionsCompleted}/${data.stats.sessionsPlanned}`,
                caption: `${data.stats.completionPct}% complete`,
              },
              {
                label: 'Streak',
                value: data.stats.currentStreak,
                caption: `${data.stats.longestStreak} best`,
              },
              {
                label: 'Source',
                value: data.source === 'live' ? 'Live' : 'Seed',
                caption: data.stats.anyLogged ? 'logs active' : 'no logs yet',
              },
            ]}
          />
          <SpotlightCard evidence={data.spotlight} nextMilestone={data.nextMilestone} />
        </>
      ) : null}
    </Screen>
  );
}

function LoadingPanel() {
  return (
    <Panel>
      <StatLabel>Loading</StatLabel>
      <Text style={styles.body}>Assembling plan, Strava evidence, and weekly progress.</Text>
    </Panel>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Panel>
      <View style={styles.stack}>
        <StatusPill label="Offline" tone="coral" />
        <Text style={styles.body}>{message}</Text>
        <Button title="Try again" variant="quiet" onPress={onRetry} />
      </View>
    </Panel>
  );
}

function SpotlightCard({
  evidence,
  nextMilestone,
}: {
  evidence: ActivityEvidence | null;
  nextMilestone: DashboardData['nextMilestone'];
}) {
  return (
    <Panel>
      <View style={styles.stack}>
        <StatLabel>Spotlight</StatLabel>
        <Text style={styles.title}>{evidence?.name ?? 'No verified run yet'}</Text>
        <Text style={styles.body}>
          {evidence
            ? `${km(metersToKm(evidence.distanceM))} · ${secondsToMinutes(evidence.movingTimeS)} min`
            : 'The latest linked Strava run will appear here after sync.'}
        </Text>
        {nextMilestone ? (
          <View style={styles.milestone}>
            <StatLabel>Next marker</StatLabel>
            <Text style={styles.body}>
              {nextMilestone.title}
              {nextMilestone.dateShort ? ` · ${nextMilestone.dateShort}` : ''}
              {nextMilestone.daysAway != null ? ` · ${nextMilestone.daysAway}d` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </Panel>
  );
}

function metersToKm(value: number | null | undefined): number | null {
  return value == null ? null : Math.round((value / 1000) * 10) / 10;
}

function secondsToMinutes(value: number | null | undefined): string {
  return value == null ? '--' : String(Math.round(value / 60));
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
  milestone: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing[4],
    gap: spacing[2],
  },
});
