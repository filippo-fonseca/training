import { StyleSheet, Text, View } from 'react-native';

import { Panel } from '@/components/ui/Panel';
import { StatLabel } from '@/components/ui/StatLabel';
import { alpha, colors, fonts, km, spacing, typography } from '@/lib/theme';

export type Week = {
  loggedKm: number;
  plannedKm: number;
  rangeMin: number | null;
  rangeMax: number | null;
  phaseLabel: string;
  hasLogs: boolean;
};

type WeekGaugeProps = {
  data: Week;
  weekIndex?: number;
};

export function WeekGauge({ data, weekIndex }: WeekGaugeProps) {
  const planned = data.plannedKm > 0 ? data.plannedKm : data.rangeMax ?? 1;
  const pct = Math.max(0, Math.min(1, data.loggedKm / planned));
  const range =
    data.rangeMin != null && data.rangeMax != null
      ? `${km(data.rangeMin)} - ${km(data.rangeMax)}`
      : km(data.plannedKm);

  return (
    <Panel>
      <View style={styles.header}>
        <View>
          <StatLabel>{weekIndex ? `Week ${weekIndex}` : 'This week'}</StatLabel>
          <Text style={styles.title}>{data.phaseLabel || 'Training volume'}</Text>
        </View>
        <Text style={styles.value}>{km(data.loggedKm, '0 km')}</Text>
      </View>
      <View style={styles.rail}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Target {range}</Text>
        <Text style={styles.meta}>{data.hasLogs ? 'Live logs' : 'Projected'}</Text>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  title: {
    ...typography.h2,
    marginTop: spacing[2],
  },
  value: {
    color: colors.accent,
    fontFamily: fonts.monoBold,
    fontSize: 22,
    letterSpacing: -0.8,
  },
  rail: {
    height: 12,
    marginTop: spacing[5],
    borderRadius: 999,
    backgroundColor: colors.darkBox,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  meta: {
    ...typography.small,
    color: alpha(colors.inkDull, 0.85),
  },
});
