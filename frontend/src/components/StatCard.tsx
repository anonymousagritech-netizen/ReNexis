import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/theme';

export function StatCard({
  label,
  value,
  accentColor = colors.primary,
  subtext,
}: {
  label: string;
  value: string;
  accentColor?: string;
  subtext?: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: `${accentColor}14`, borderColor: `${accentColor}40` }]}>
      <View style={[styles.iconChip, { backgroundColor: `${accentColor}26` }]}>
        <View style={[styles.iconDot, { backgroundColor: accentColor }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 200,
    flexGrow: 1,
    flexBasis: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.h1,
  },
  subtext: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
