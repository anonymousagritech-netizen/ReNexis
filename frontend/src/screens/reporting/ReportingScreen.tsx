import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { DataTable, Column } from '@/components/DataTable';
import { colors, spacing, typography, moduleColors } from '@/theme/theme';
import { getTreatyPerformance, getCombinedRatio, getTopCounterparties, getExposureHeatmap, getRetroNetPosition } from '@/api/dashboard.api';
import { formatCurrency, formatPercent } from '@/utils/format';

export function ReportingScreen() {
  const [performance, setPerformance] = useState<any[]>([]);
  const [combined, setCombined] = useState<any>(null);
  const [topCounterparties, setTopCounterparties] = useState<any[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [retroPosition, setRetroPosition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [perf, cr, top, heatmap, retro] = await Promise.all([
          getTreatyPerformance(),
          getCombinedRatio('2026-01-01', '2026-12-31'),
          getTopCounterparties(5),
          getExposureHeatmap(),
          getRetroNetPosition(),
        ]);
        setPerformance(perf);
        setCombined(cr);
        setTopCounterparties(top);
        setHeatmapPoints(heatmap);
        setRetroPosition(retro);
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
      <ScreenHeader accentColor={moduleColors.reporting.main} title="Reports & Analytics" subtitle="Module 8 · Treaty performance, combined ratio, top counterparties" />

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

      {retroPosition && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.cardLabel}>Retrocession Net Position</Text>
          <Text style={styles.muted}>
            Gross assumed incurred, net of retro recoveries — the true risk retained after all layers of protection.
          </Text>
          <View style={styles.retroRow}>
            <RetroStat label="Gross Assumed Incurred" value={formatCurrency(retroPosition.grossAssumedIncurred)} />
            <RetroStat label="Retro Recovered" value={formatCurrency(retroPosition.retroRecovered)} color={colors.success} />
            <RetroStat label="Net Retained Position" value={formatCurrency(retroPosition.netRetainedPosition)} color={colors.primary} />
          </View>
        </Card>
      )}

      {heatmapPoints.length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.cardLabel}>Catastrophe Exposure by Zone</Text>
          <ExposureHeatmap points={heatmapPoints} />
        </Card>
      )}

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

function RetroStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ minWidth: 160 }}>
      <Text style={styles.retroLabel}>{label}</Text>
      <Text style={[styles.retroValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function ExposureHeatmap({ points }: { points: any[] }) {
  const byZone = new Map<string, number>();
  for (const p of points) {
    const zone = p.catZone || 'Unzoned';
    byZone.set(zone, (byZone.get(zone) || 0) + Number(p.sumInsured || 0));
  }
  const entries = Array.from(byZone.entries()).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 1;

  return (
    <View style={styles.heatmapGrid}>
      {entries.map(([zone, value]) => {
        const intensity = Math.max(0.15, value / max);
        return (
          <View key={zone} style={[styles.heatmapTile, { backgroundColor: `rgba(242,92,84,${intensity})` }]}>
            <Text style={styles.heatmapZone}>{zone}</Text>
            <Text style={styles.heatmapValue}>{formatCurrency(value)}</Text>
          </View>
        );
      })}
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
  retroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, marginTop: spacing.md },
  retroLabel: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  retroValue: { ...typography.h3, color: colors.textPrimary },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heatmapTile: { minWidth: 160, borderRadius: 10, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  heatmapZone: { ...typography.bodyMedium, color: colors.white, marginBottom: 4 },
  heatmapValue: { ...typography.small, color: colors.white },
});
