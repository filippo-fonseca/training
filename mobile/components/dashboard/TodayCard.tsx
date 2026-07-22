import { StyleSheet, Text, View } from 'react-native';

import { Panel } from '@/components/ui/Panel';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { colors, km, spacing, typography } from '@/lib/theme';

export type Today = {
  dateShort: string | null;
  weekday: string | null;
  sessionTitle: string;
  category: string | null;
  isRest: boolean;
  nothingPlanned: boolean;
  distanceKm: number | null;
  paceText: string | null;
  rpeText: string | null;
  evidence?: unknown[];
  onPlan: boolean;
  offPlanRun: boolean;
};

export function TodayCard({ data }: { data: Today }) {
  const status = data.onPlan
    ? { label: 'Verified', tone: 'sage' as const }
    : data.offPlanRun
      ? { label: 'Off-plan run', tone: 'strava' as const }
      : data.isRest
        ? { label: 'Rest', tone: 'muted' as const }
        : { label: 'Planned', tone: 'accent' as const };

  return (
    <Panel>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <StatLabel>
            {data.weekday ? `Today · ${data.weekday}` : 'Today'}
          </StatLabel>
          <Text style={styles.title}>{data.sessionTitle}</Text>
        </View>
        <StatusPill label={status.label} tone={status.tone} />
      </View>
      <View style={styles.metrics}>
        <Metric label="Distance" value={data.nothingPlanned ? '--' : km(data.distanceKm)} />
        <Metric label="Pace" value={data.paceText ?? '--'} />
        <Metric label="RPE" value={data.rpeText ?? '--'} />
      </View>
      <Text style={styles.footer}>
        {data.dateShort ?? 'Today'} · {formatCategory(data.category)}
      </Text>
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

function formatCategory(category: string | null): string {
  if (!category) return 'Training';
  return category.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[2],
  },
  title: {
    ...typography.h2,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  metric: {
    flex: 1,
    gap: spacing[1],
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.numeral.fontFamily,
    fontSize: 16,
  },
  footer: {
    ...typography.small,
    marginTop: spacing[4],
    textTransform: 'capitalize',
  },
});
