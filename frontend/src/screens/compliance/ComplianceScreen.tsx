import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/theme/theme';
import { getComplianceDashboard, listRegulatoryReports, createRegulatoryReport } from '@/api/compliance.api';
import { entitiesApi } from '@/api/parties.api';
import { formatDate } from '@/utils/format';

export function ComplianceScreen() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, rpts, entities] = await Promise.all([getComplianceDashboard(), listRegulatoryReports(), entitiesApi.list({ pageSize: 10 })]);
      setDashboard(dash);
      setReports(rpts);
      setEntityId(entities.items[0]?.id || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateScheduleF = async () => {
    if (!entityId) return;
    setGenerating(true);
    try {
      await createRegulatoryReport({
        reportType: 'SCHEDULE_F',
        entityId,
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
      });
      await fetchData();
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !dashboard) {
    return <View style={{ padding: spacing.xxl }}><Text style={{ color: colors.textMuted }}>Loading…</Text></View>;
  }

  return (
    <View>
      <ScreenHeader title="Compliance & Regulatory" subtitle="Module 7 · KYC/AML, Schedule F, IFRS17 CSM tracking" />

      <View style={styles.statGrid}>
        <StatCard label="Pending KYC" value={String(dashboard.pendingKyc)} accentColor={colors.accentAmber} />
        <StatCard label="High AML Risk" value={String(dashboard.highRiskParties.length)} accentColor={colors.danger} />
        <StatCard label="Flagged Checks" value={String(dashboard.flaggedChecks.length)} accentColor={colors.danger} />
      </View>

      {dashboard.highRiskParties.length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.cardLabel}>High AML Risk Counterparties</Text>
          {dashboard.highRiskParties.map((p: any) => (
            <View key={p.id} style={styles.row}>
              <Text style={styles.rowText}>{p.name}</Text>
              <Text style={styles.rowMeta}>{p.type} · {p.country}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>Regulatory Reports</Text>
          <Button label="Generate Schedule F" small variant="secondary" onPress={handleGenerateScheduleF} loading={generating} />
        </View>
        {reports.length === 0 ? (
          <Text style={styles.muted}>No regulatory reports generated yet.</Text>
        ) : (
          reports.map((r) => (
            <View key={r.id} style={styles.row}>
              <View>
                <Text style={styles.rowText}>{r.reportType.replace(/_/g, ' ')}</Text>
                <Text style={styles.rowMeta}>{formatDate(r.periodStart)} – {formatDate(r.periodEnd)}</Text>
              </View>
              <Badge label={r.status} />
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
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { ...typography.bodyMedium, color: colors.textPrimary },
  rowMeta: { ...typography.small, color: colors.textMuted },
  muted: { ...typography.body, color: colors.textMuted },
});
