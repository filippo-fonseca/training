import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { alpha, colors, fonts, radius, spacing } from '@/lib/theme';

type ButtonVariant = 'primary' | 'quiet' | 'ghost';

type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.app : colors.accent} />
      ) : (
        <Text style={[styles.text, variant === 'primary' && styles.primaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chrome,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  quiet: {
    backgroundColor: alpha(colors.accent, 0.12),
    borderColor: alpha(colors.accent, 0.26),
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.line,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ translateY: 1 }],
  },
  disabled: {
    opacity: 0.48,
  },
  text: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  primaryText: {
    color: colors.app,
  },
});
