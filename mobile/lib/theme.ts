import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  app: '#1c1e28',
  box: '#23252f',
  darkBox: '#1a1b24',
  line: '#2e303c',
  divider: '#2a2c36',
  ink: '#f2f3f7',
  inkDull: '#a7aab8',
  inkFaint: '#6d7080',
  accent: '#34c3e0',
  accentFaint: '#7ad7ea',
  sage: '#7dcea0',
  amber: '#e0b35c',
  coral: '#e07a6a',
  strava: '#fc4c02',
} as const;

export const radius = {
  card: 12,
  chrome: 6,
  pill: 999,
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
} as const;

export const fonts = {
  sans: 'SpaceGrotesk',
  sansMedium: 'SpaceGrotesk_500Medium',
  sansSemi: 'SpaceGrotesk_600SemiBold',
  sansBold: 'SpaceGrotesk_700Bold',
  mono: 'JetBrainsMono',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const typography = {
  title: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 34,
    letterSpacing: -1.1,
    lineHeight: 38,
  },
  h1: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  h2: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
    fontSize: 21,
    letterSpacing: -0.35,
    lineHeight: 26,
  },
  body: {
    color: colors.inkDull,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    color: colors.inkFaint,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  monoLabel: {
    color: colors.inkFaint,
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.3,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  numeral: {
    color: colors.ink,
    fontFamily: fonts.monoBold,
    letterSpacing: -1,
  },
} satisfies Record<string, TextStyle>;

export const chrome = {
  card: {
    backgroundColor: colors.box,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  inset: {
    backgroundColor: colors.darkBox,
    borderColor: colors.divider,
    borderWidth: 1,
    borderRadius: radius.chrome,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} satisfies Record<string, ViewStyle>;

export function alpha(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const value = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${value}`;
}

export function km(value: number | null | undefined, fallback = '--'): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return `${Math.round(value * 10) / 10} km`;
}
