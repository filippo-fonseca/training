import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { alpha, chrome, colors, radius, spacing } from '@/lib/theme';

type PanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  glow?: boolean;
};

export function Panel({ children, style, padded = true, glow = false }: PanelProps) {
  return (
    <View style={[styles.shell, glow && chrome.glow, style]}>
      <LinearGradient
        colors={[alpha(colors.ink, 0.045), alpha(colors.darkBox, 0)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...chrome.card,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.card,
  },
  content: {
    position: 'relative',
  },
  padded: {
    padding: spacing[5],
  },
});
