import { StyleSheet, Text, View } from 'react-native';

import { Panel } from '@/components/ui/Panel';
import { StatLabel } from '@/components/ui/StatLabel';
import { colors, fonts, spacing } from '@/lib/theme';

export type Stat = {
  label: string;
  value: string | number;
  caption?: string;
};

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Panel key={stat.label} style={styles.card}>
          <StatLabel>{stat.label}</StatLabel>
          <Text style={styles.value}>{stat.value}</Text>
          {stat.caption ? <Text style={styles.caption}>{stat.caption}</Text> : null}
        </Panel>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  card: {
    flexGrow: 1,
    flexBasis: '47%',
  },
  value: {
    color: colors.ink,
    fontFamily: fonts.monoBold,
    fontSize: 24,
    letterSpacing: -1,
    marginTop: spacing[2],
  },
  caption: {
    color: colors.inkFaint,
    fontFamily: fonts.sans,
    fontSize: 12,
    marginTop: spacing[1],
  },
});
