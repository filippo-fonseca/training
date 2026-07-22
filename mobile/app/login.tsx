import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { StatLabel } from '@/components/ui/StatLabel';
import { useAuth } from '@/lib/auth';
import { colors, fonts, spacing, typography } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, user, isOwner, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Owner login"
      subtitle="Sign in only when you need admin actions. The public dashboard stays open."
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Panel>
          {user ? (
            <View style={styles.stack}>
              <StatLabel>Signed in</StatLabel>
              <Text style={styles.title}>{user.email}</Text>
              <Text style={styles.body}>
                {isOwner
                  ? 'This session can use owner-only mobile actions.'
                  : 'This account is signed in, but it does not match the configured owner email.'}
              </Text>
              <Button title="Back to admin" onPress={() => router.replace('/(tabs)/admin')} />
              <Button title="Sign out" variant="ghost" onPress={signOut} />
            </View>
          ) : (
            <View style={styles.stack}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                title="Sign in"
                loading={submitting}
                disabled={!email.trim() || password.length === 0}
                onPress={submit}
              />
            </View>
          )}
        </Panel>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type FieldProps = ComponentProps<typeof TextInput> & {
  label: string;
};

function Field({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <StatLabel>{label}</StatLabel>
      <TextInput
        {...props}
        placeholderTextColor={colors.inkFaint}
        selectionColor={colors.accent}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing[4],
  },
  field: {
    gap: spacing[2],
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.darkBox,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    paddingHorizontal: spacing[3],
  },
  title: {
    ...typography.h2,
  },
  body: {
    ...typography.body,
  },
  error: {
    color: colors.coral,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
});
