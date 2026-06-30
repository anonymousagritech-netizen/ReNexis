import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { colors, radius, spacing, typography, getStatusColor, moduleColors } from '@/theme/theme';
import { getLifecycleBoard, getRenewalsDue, getRunOffWatch } from '@/api/dashboard.api';
import { formatCurrency } from '@/utils/format';
import { formatDate, titleCase } from '@/utils/format';
import { useAppNavigation } from '@/navigation/NavigationContext';

export function LifecycleScreen() {
  const { navigate } = useAppNavigation();
  const [board, setBoard] = useState<Record<string, any[]>>({});
  const [stages, setStages] = useState<string[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [runOff, setRunOff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLifecycleBoard(), getRenewalsDue(60), getRunOffWatch()]).then(([boardRes, renewalsRes, runOffRes]) => {
      setBoard(boardRes.board);
      setStages(boardRes.stages);
      setRenewals(renewalsRes);
      setRunOff(runOffRes);
      setLoading(false);
    });
  }, []);

  return (
    <View>
      <ScreenHeader accentColor={moduleColors.lifecycle.main} title="Product Lifecycle" subtitle="Treaty stage workflow: Design → Quoted → Bound → In-Force → Renewal → Run-off → Closed" />

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
                    {items.length === 0 && <Text style={styles.emptyCol}>-</Text>}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={styles.panelsRow}>
        <Card style={styles.panel}>
          <Text style={styles.panelTitle}>Renewals Due (next 60 days)</Text>
          {renewals.length === 0 ? (
            <Text style={styles.emptyPanel}>No renewals due soon.</Text>
          ) : (
            renewals.map((c: any) => (
              <Pressable key={c.id} style={styles.panelRow} onPress={() => navigate('contracts', { contractId: c.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelRowTitle}>{c.name}</Text>
                  <Text style={styles.panelRowMeta}>{c.contractNumber}</Text>
                </View>
                <Text style={styles.panelRowDate}>{formatDate(c.expiryDate)}</Text>
              </Pressable>
            ))
          )}
        </Card>

        <Card style={styles.panel}>
          <Text style={styles.panelTitle}>Run-off Watch (open long-tail claims)</Text>
          {runOff.length === 0 ? (
            <Text style={styles.emptyPanel}>No closed/run-off contracts with open claims.</Text>
          ) : (
            runOff.map((c: any, idx: number) => (
              <View key={idx} style={styles.panelRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelRowTitle}>{c.name}</Text>
                  <Text style={styles.panelRowMeta}>{c.contractNumber} · {c.openClaimsCount} open claim{c.openClaimsCount === 1 ? '' : 's'}</Text>
                </View>
                <Text style={styles.panelRowDate}>{formatCurrency(c.openClaimsReserve)}</Text>
              </View>
            ))
          )}
        </Card>
      </View>
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
  panelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xl },
  panel: { flex: 1, minWidth: 340 },
  panelTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  panelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  panelRowTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  panelRowMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  panelRowDate: { ...typography.small, color: colors.textSecondary },
  emptyPanel: { ...typography.body, color: colors.textMuted, paddingVertical: spacing.md },
});
