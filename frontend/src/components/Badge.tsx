import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor, radius, spacing, typography } from '@/theme/theme';

export function Badge({ label, status }: { label: string; status?: string }) {
  const colors = getStatusColor(status || label);
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.fg }]} numberOfLines={1}>
        {label.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
});
