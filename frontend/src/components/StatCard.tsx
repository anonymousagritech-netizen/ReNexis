import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors, spacing, typography } from '@/theme/theme';

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
    <Card style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 200,
    flexGrow: 1,
    flexBasis: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtext: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
