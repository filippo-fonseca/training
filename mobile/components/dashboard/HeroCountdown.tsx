import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { Panel } from '@/components/ui/Panel';
import { StatLabel } from '@/components/ui/StatLabel';
import { alpha, colors, fonts, radius, spacing, typography } from '@/lib/theme';

export type Countdown = {
  daysToRace: number;
  status: 'upcoming' | 'today' | 'past';
  raceName: string;
  raceDateShort: string | null;
  weekIndex: number;
  totalWeeks: number;
  phaseLabel: string;
  phaseProgress: number;
};

type HeroCountdownProps = {
  data: Countdown;
  dayNumber?: number;
  totalDays?: number;
};

export function HeroCountdown({ data, dayNumber, totalDays }: HeroCountdownProps) {
  const label = data.status === 'today' ? 'Race day' : data.status === 'past' ? 'Finished' : 'Days to race';
  const value = data.status === 'today' ? 'GO' : String(Math.max(0, data.daysToRace));
  const phaseProgress =
    `${Math.round(Math.max(0, Math.min(1, data.phaseProgress)) * 100)}%` as DimensionValue;

  return (
    <Panel glow style={styles.panel}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <StatLabel>{label}</StatLabel>
          <Text style={styles.race}>{data.raceName}</Text>
          <Text style={styles.meta}>
            {data.raceDateShort ?? 'Date TBD'} · Week {data.weekIndex} of {data.totalWeeks}
          </Text>
        </View>
        <View style={styles.orb}>
          <LinearGradient
            colors={[alpha(colors.accent, 0.28), alpha(colors.accentFaint, 0.04)]}
            style={styles.orbGradient}
          />
          <Text style={styles.number}>{value}</Text>
        </View>
      </View>
      <View style={styles.phase}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseName}>{data.phaseLabel || 'Training block'}</Text>
          {dayNumber && totalDays ? (
            <Text style={styles.phaseMeta}>
              Day {dayNumber}/{totalDays}
            </Text>
          ) : null}
        </View>
        <View style={styles.rail}>
          <View style={[styles.fill, { width: phaseProgress }]} />
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.darkBox,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  copy: {
    flex: 1,
    gap: spacing[2],
  },
  race: {
    ...typography.h1,
  },
  meta: {
    ...typography.small,
  },
  orb: {
    width: 116,
    height: 116,
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: alpha(colors.accent, 0.3),
  },
  orbGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  number: {
    color: colors.ink,
    fontFamily: fonts.monoBold,
    fontSize: 42,
    letterSpacing: -2,
  },
  phase: {
    marginTop: spacing[5],
    gap: spacing[2],
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  phaseName: {
    color: colors.inkDull,
    fontFamily: fonts.sansSemi,
    fontSize: 13,
  },
  phaseMeta: {
    color: colors.inkFaint,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  rail: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.line,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
});
