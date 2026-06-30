import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { colors, radius, spacing, typography, getStatusColor } from '@/theme/theme';
import { getLifecycleBoard } from '@/api/dashboard.api';
import { formatDate, titleCase } from '@/utils/format';
import { useAppNavigation } from '@/navigation/NavigationContext';

export function LifecycleScreen() {
  const { navigate } = useAppNavigation();
  const [board, setBoard] = useState<Record<string, any[]>>({});
  const [stages, setStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLifecycleBoard().then((res) => {
      setBoard(res.board);
      setStages(res.stages);
      setLoading(false);
    });
  }, []);

  return (
    <View>
      <ScreenHeader title="Product Lifecycle" subtitle="Module 9 · Treaty stage workflow: Design → Quoted → Bound → In-Force → Renewal → Run-off → Closed" />

      {loading ? (
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.board}>
            {stages.map((stage) => {
              const items = board[stage] || [];
              const statusColor = getStatusColor(stage);
              return (
                <View key={stage} style={styles.column}>
                  <View style={styles.columnHeader}>
                    <Text style={styles.columnTitle}>{titleCase(stage)}</Text>
                    <View style={[styles.countBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.countText, { color: statusColor.fg }]}>{items.length}</Text>
                    </View>
                  </View>
                  <ScrollView style={styles.columnBody}>
                    {items.map((item) => (
                      <Pressable key={item.id} style={styles.cardItem} onPress={() => navigate('contracts', { contractId: item.id })}>
                        <Text style={styles.cardItemTitle} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.cardItemMeta}>{item.contractNumber}</Text>
                        <Text style={styles.cardItemMeta}>Expires {formatDate(item.expiryDate)}</Text>
                      </Pressable>
                    ))}
                    {items.length === 0 && <Text style={styles.emptyCol}>—</Text>}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.lg },
  column: { width: 240, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, maxHeight: 600 },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  columnTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  countBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  countText: { ...typography.caption },
  columnBody: { maxHeight: 540 },
  cardItem: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  cardItemTitle: { ...typography.small, color: colors.textPrimary, fontWeight: '700', marginBottom: 4 },
  cardItemMeta: { ...typography.caption, color: colors.textMuted },
  emptyCol: { ...typography.small, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
