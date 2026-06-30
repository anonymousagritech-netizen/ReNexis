import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '@/theme/theme';

export function ScreenHeader({
  title,
  subtitle,
  actions,
  accentColor = colors.primary,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  accentBar: {
    width: 4,
    borderRadius: radius.pill,
    alignSelf: 'stretch',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
