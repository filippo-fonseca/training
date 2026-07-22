import { StyleSheet, Text, type TextProps } from 'react-native';

import { typography } from '@/lib/theme';

type StatLabelProps = TextProps & {
  children: string;
};

export function StatLabel({ children, style, ...props }: StatLabelProps) {
  return (
    <Text {...props} style={[styles.label, style]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.monoLabel,
  },
});
