import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAuth } from '@/lib/auth';
import { env, isSupabaseConfigured } from '@/lib/env';
import { spacing, typography } from '@/lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isOwner, signOut } = useAuth();

  return (
    <Screen title="Settings" eyebrow="Admin" subtitle="Runtime and session configuration.">
      <Panel>
        <View style={styles.stack}>
          <View style={styles.header}>
            <StatLabel>Session</StatLabel>
            <StatusPill label={isOwner ? 'Owner' : user ? 'Signed in' : 'Signed out'} tone={isOwner ? 'sage' : 'amber'} />
          </View>
          <Setting label="Email" value={user?.email ?? '--'} />
          <Setting label="Owner gate" value={env.ownerEmail || 'Any signed-in session'} />
          {user ? (
            <Button title="Sign out" variant="ghost" onPress={signOut} />
          ) : (
            <Button title="Sign in" onPress={() => router.push('/login')} />
          )}
        </View>
      </Panel>
      <Panel>
        <View style={styles.stack}>
          <StatLabel>Runtime</StatLabel>
          <Setting label="API base" value={env.apiBaseUrl} />
          <Setting label="Supabase" value={isSupabaseConfigured ? 'Configured' : 'Fallback env'} />
          <Setting label="Version" value={env.appVersion} />
        </View>
      </Panel>
    </Screen>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.setting}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  setting: {
    gap: spacing[1],
  },
  settingLabel: {
    ...typography.small,
  },
  settingValue: {
    ...typography.body,
  },
});
