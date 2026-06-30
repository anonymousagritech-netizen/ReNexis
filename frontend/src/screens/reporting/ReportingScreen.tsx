import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { DataTable, Column } from '@/components/DataTable';
import { colors, spacing, typography } from '@/theme/theme';
import { getTreatyPerformance, getCombinedRatio, getTopCounterparties } from '@/api/dashboard.api';
import { formatCurrency, formatPercent } from '@/utils/format';

export function ReportingScreen() {
  const [performance, setPerformance] = useState<any[]>([]);
  const [combined, setCombined] = useState<any>(null);
  const [topCounterparties, setTopCounterparties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [perf, cr, top] = await Promise.all([
          getTreatyPerformance(),
          getCombinedRatio('2026-01-01', '2026-12-31'),
          getTopCounterparties(5),
        ]);
        setPerformance(perf);
        setCombined(cr);
        setTopCounterparties(top);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns: Column<any>[] = [
    { key: 'contractNumber', header: 'Contract', width: 160, render: (r: any) => r.contractNumber },
    { key: 'name', header: 'Name', width: 240, render: (r: any) => r.name },
    { key: 'premium', header: 'Premium', width: 140, render: (r: any) => formatCurrency(r.premium) },
    { key: 'claims', header: 'Claims', width: 140, render: (r: any) => formatCurrency(r.claims) },
    { key: 'lossRatioPct', header: 'Loss Ratio', width: 110, render: (r: any) => formatPercent(r.lossRatioPct) },
  ];

  return (
    <View>
      <ScreenHeader title="Reports & Analytics" subtitle="Module 8 · Treaty performance, combined ratio, top counterparties" />

      {combined && (
        <View style={styles.statGrid}>
          <StatCard label="Loss Ratio" value={formatPercent(combined.lossRatioPct)} accentColor={colors.danger} />
          <StatCard label="Expense Ratio" value={formatPercent(combined.expenseRatioPct)} accentColor={colors.accentAmber} />
          <StatCard label="Combined Ratio" value={formatPercent(combined.combinedRatioPct)} accentColor={colors.primary} subtext={combined.combinedRatioPct < 100 ? 'Underwriting profit' : 'Underwriting loss'} />
        </View>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardLabel}>Treaty Performance</Text>
        <DataTable columns={columns} data={performance} loading={loading} emptyMessage="No performance data yet." />
      </Card>

      <Card>
        <Text style={styles.cardLabel}>Top Counterparties by Premium Volume</Text>
        {topCounterparties.length === 0 ? (
          <Text style={styles.muted}>No counterparty volume data yet.</Text>
        ) : (
          topCounterparties.map((t, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.rowText}>{t.party.name}</Text>
              <Text style={styles.rowValue}>{formatCurrency(t.totalPremium)}</Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  cardLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { ...typography.bodyMedium, color: colors.textPrimary },
  rowValue: { ...typography.bodyMedium, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textMuted },
});
