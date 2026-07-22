import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { colors, spacing, typography } from '@/lib/theme';

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Screen
      title="More"
      eyebrow="Explore"
      subtitle="Deeper public views for the training block."
    >
      <Panel>
        <View style={styles.stack}>
          <StatLabel>Stats</StatLabel>
          <Text style={styles.title}>Completion, heatmap, and type mix</Text>
          <Text style={styles.body}>
            See plan-wide totals, completed work, streaks, and the training heatmap.
          </Text>
          <Button title="Open stats" onPress={() => router.push('/stats')} />
        </View>
      </Panel>
      <Panel>
        <View style={styles.stack}>
          <StatLabel>Milestones</StatLabel>
          <Text style={styles.title}>The 14-week checkpoint timeline</Text>
          <Text style={styles.body}>
            Track gated long runs, decision checkpoints, and the race terminus.
          </Text>
          <Button title="Open milestones" variant="quiet" onPress={() => router.push('/milestones')} />
        </View>
      </Panel>
      <Panel>
        <View style={styles.stack}>
          <StatLabel>App mode</StatLabel>
          <Text style={styles.body}>
            Public data is readable without login. Owner-only actions live behind the Admin tab.
          </Text>
          <View style={styles.line} />
        </View>
      </Panel>
    </Screen>
  );
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
  line: {
    height: 1,
    backgroundColor: colors.divider,
  },
});
