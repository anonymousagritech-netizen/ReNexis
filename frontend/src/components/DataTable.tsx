import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
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
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        {columns.map((col, idx) => (
          <View key={col.key} style={[styles.cell, { flexGrow: col.width || 1 }, idx !== columns.length - 1 && styles.cellBorder]}>
            <Text style={styles.headerText}>{col.header}</Text>
          </View>
        ))}
      </View>
      {data.map((row, rowIdx) => {
        const RowWrapper = onRowPress ? Pressable : View;
        return (
          <RowWrapper
            key={row.id}
            onPress={onRowPress ? () => onRowPress(row) : undefined}
            style={
              [
                styles.row,
                rowIdx % 2 === 1 && styles.rowAlt,
                rowIdx !== data.length - 1 && styles.rowDivider,
                onRowPress && styles.rowPressable,
              ] as any
            }
          >
            {columns.map((col, idx) => (
              <View key={col.key} style={[styles.cell, { flexGrow: col.width || 1 }, idx !== columns.length - 1 && styles.cellBorder]}>
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
    </View>
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
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  headerRow: {
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowAlt: {
    backgroundColor: colors.surfaceAlt,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressable: {
    cursor: 'pointer' as any,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  headerText: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  cellText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
