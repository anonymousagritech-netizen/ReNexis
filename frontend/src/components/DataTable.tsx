import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/theme';

export interface Column<T> {
  key: string;
  header: string;
  width?: number;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  onRowPress,
  emptyMessage = 'No records found.',
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowPress?: (row: T) => void;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data.length) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View>
        <View style={styles.headerRow}>
          {columns.map((col) => (
            <View key={col.key} style={[styles.cell, { width: col.width || 140 }]}>
              <Text style={styles.headerText}>{col.header}</Text>
            </View>
          ))}
        </View>
        <ScrollView style={styles.body}>
          {data.map((row, idx) => {
            const RowWrapper = onRowPress ? Pressable : View;
            return (
              <RowWrapper
                key={row.id}
                onPress={onRowPress ? () => onRowPress(row) : undefined}
                style={[styles.row, idx % 2 === 1 && styles.rowAlt, onRowPress && styles.rowPressable] as any}
              >
                {columns.map((col) => (
                  <View key={col.key} style={[styles.cell, { width: col.width || 140 }]}>
                    {typeof col.render(row) === 'string' || typeof col.render(row) === 'number' ? (
                      <Text style={styles.cellText} numberOfLines={1}>
                        {col.render(row)}
                      </Text>
                    ) : (
                      col.render(row)
                    )}
                  </View>
                ))}
              </RowWrapper>
            );
          })}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerText: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  body: {
    maxHeight: 520,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  rowAlt: {
    backgroundColor: colors.surfaceAlt,
  },
  rowPressable: {
    cursor: 'pointer' as any,
  },
  cell: {
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  cellText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
