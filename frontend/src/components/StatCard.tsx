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
      <View style={styles.topRow}>
        <View style={[styles.iconChip, { backgroundColor: `${accentColor}26` }]}>
          <View style={[styles.iconDot, { backgroundColor: accentColor }]} />
        </View>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 150,
    maxWidth: 280,
    flexGrow: 1,
    flexBasis: '15%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  iconChip: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
