import { StyleSheet, Text, View } from 'react-native';

import { alpha, colors, fonts, radius, spacing } from '@/lib/theme';

type StatusTone = 'accent' | 'sage' | 'amber' | 'coral' | 'strava' | 'muted';

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

const toneColor: Record<StatusTone, string> = {
  accent: colors.accent,
  sage: colors.sage,
  amber: colors.amber,
  coral: colors.coral,
  strava: colors.strava,
  muted: colors.inkFaint,
};

export function StatusPill({ label, tone = 'muted' }: StatusPillProps) {
  const color = toneColor[tone];
  return (
    <View style={[styles.pill, { borderColor: alpha(color, 0.32), backgroundColor: alpha(color, 0.12) }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.9,
  },
});
