import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAuth } from '@/lib/auth';
import { spacing, typography } from '@/lib/theme';

export default function AdminHubScreen() {
  const router = useRouter();
  const { user, isOwner, loading } = useAuth();

  if (!isOwner) {
    return (
      <Screen
        title="Admin"
        eyebrow="Owner actions"
        subtitle="Sign in only for private Supabase and Strava operations."
      >
        <Panel>
          <View style={styles.stack}>
            <StatusPill label={loading ? 'Checking' : user ? 'Not owner' : 'Signed out'} tone="amber" />
            <Text style={styles.body}>
              {user
                ? 'This signed-in account does not match the configured owner gate.'
                : 'Public tracking works without a session. Admin actions require the owner login.'}
            </Text>
            <Button title="Sign in" onPress={() => router.push('/login')} />
          </View>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen title="Admin" eyebrow="Owner console" subtitle="Mobile-safe actions for daily upkeep.">
      <AdminLink title="Strava" label="Connect, sync, auto-link, or disconnect." onPress={() => router.push('/(tabs)/admin/strava')} />
      <AdminLink title="Log today" label="Toggle today complete with the active Supabase session." onPress={() => router.push('/(tabs)/admin/log')} />
      <AdminLink title="Health note" label="Write a private health entry for today." onPress={() => router.push('/(tabs)/admin/health')} />
      <AdminLink title="Plan" label="Inspect owner-readable plan rows." onPress={() => router.push('/(tabs)/admin/plan')} />
      <AdminLink title="Settings" label="Session, API base, and app version." onPress={() => router.push('/(tabs)/admin/settings')} />
    </Screen>
  );
}

function AdminLink({ title, label, onPress }: { title: string; label: string; onPress: () => void }) {
  return (
    <Panel>
      <View style={styles.stack}>
        <StatLabel>{title}</StatLabel>
        <Text style={styles.body}>{label}</Text>
        <Button title={`Open ${title}`} variant="quiet" onPress={onPress} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[3],
  },
  body: {
    ...typography.body,
  },
});
