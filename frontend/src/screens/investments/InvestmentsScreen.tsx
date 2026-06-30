import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { FormField, Input, SelectField } from '@/components/FormField';
import { colors, spacing, typography, moduleColors } from '@/theme/theme';
import { investmentsApi, getPortfolioSummary, addValuation } from '@/api/investments.api';
import { Investment } from '@/types/models';
import { formatCurrency, formatPercent } from '@/utils/format';
import { getApiErrorMessage } from '@/api/client';

const ASSET_CLASS_OPTIONS = [
  { label: 'Bond', value: 'BOND' },
  { label: 'Equity', value: 'EQUITY' },
  { label: 'Real Estate', value: 'REAL_ESTATE' },
  { label: 'Cash Equivalent', value: 'CASH_EQUIVALENT' },
  { label: 'Alternative', value: 'ALTERNATIVE' },
  { label: 'Loan', value: 'LOAN' },
];

export function InvestmentsScreen() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<{ totalMarketValue: number; allocation: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [revalueTarget, setRevalueTarget] = useState<Investment | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, sum] = await Promise.all([investmentsApi.list({ pageSize: 100 }), getPortfolioSummary()]);
      setInvestments(inv.items);
      setSummary(sum);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<Investment>[] = [
    { key: 'assetName', header: 'Asset', width: 240, render: (r) => r.assetName },
    { key: 'assetClass', header: 'Class', width: 140, render: (r) => <Badge label={r.assetClass} status="VERIFIED" /> },
    { key: 'marketValue', header: 'Market Value', width: 150, render: (r) => formatCurrency(r.marketValue, r.currency) },
    { key: 'costBasis', header: 'Cost Basis', width: 150, render: (r) => formatCurrency(r.costBasis, r.currency) },
    { key: 'yieldRate', header: 'Yield', width: 90, render: (r) => formatPercent(r.yieldRate) },
    { key: 'durationYears', header: 'Duration (yrs)', width: 120, render: (r) => r.durationYears || '—' },
    {
      key: 'actions',
      header: '',
      width: 120,
      render: (r) => <Button label="Revalue" small variant="ghost" onPress={() => setRevalueTarget(r)} />,
    },
  ];

  return (
    <View>
      <ScreenHeader accentColor={moduleColors.investment.main}         title="Investment Portfolio"
        subtitle="Asset allocation, income, valuation, ALM"
        actions={<Button label="+ Add Holding" onPress={() => setCreateOpen(true)} />}
      />

      {summary && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardLabel}>Asset Allocation ({formatCurrency(summary.totalMarketValue)} total)</Text>
          <View style={styles.allocGrid}>
            {summary.allocation.map((a) => (
              <View key={a.assetClass} style={styles.allocItem}>
                <Text style={styles.allocClass}>{a.assetClass.replace(/_/g, ' ')}</Text>
                <Text style={styles.allocPct}>{a.actualPct}%</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.min(100, a.actualPct)}%`, backgroundColor: a.breachesLimit ? colors.danger : colors.primary }]} />
                </View>
                {a.regulatoryLimitPct && (
                  <Text style={[styles.allocLimit, a.breachesLimit && { color: colors.danger }]}>
                    Limit: {a.regulatoryLimitPct}% {a.breachesLimit ? '— BREACH' : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card>
        <DataTable columns={columns} data={investments} loading={loading} emptyMessage="No investments recorded yet." />
      </Card>

      <InvestmentCreateModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchData(); }} />
      <RevalueModal investment={revalueTarget} onClose={() => setRevalueTarget(null)} onSaved={() => { setRevalueTarget(null); fetchData(); }} />
    </View>
  );
}

function InvestmentCreateModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    assetName: '', assetClass: 'BOND', currency: 'USD', quantity: '1', costBasis: '', marketValue: '',
    acquisitionDate: new Date().toISOString().slice(0, 10), yieldRate: '', regulatoryLimitPct: '', durationYears: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.assetName || !form.costBasis || !form.marketValue) {
      setError('Asset name, cost basis, and market value are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await investmentsApi.create({
        ...form,
        quantity: Number(form.quantity) as any,
        costBasis: Number(form.costBasis) as any,
        marketValue: Number(form.marketValue) as any,
        yieldRate: form.yieldRate ? (Number(form.yieldRate) as any) : undefined,
        regulatoryLimitPct: form.regulatoryLimitPct ? (Number(form.regulatoryLimitPct) as any) : undefined,
        durationYears: form.durationYears ? (Number(form.durationYears) as any) : undefined,
      } as any);
      onCreated();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Investment Holding" width={520}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Asset Name" required><Input value={form.assetName} onChangeText={(v) => update('assetName', v)} placeholder="US Treasury Bond 10Y" /></FormField>
      <FormField label="Asset Class"><SelectField value={form.assetClass} options={ASSET_CLASS_OPTIONS} onChange={(v) => update('assetClass', v)} /></FormField>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Cost Basis" required><Input value={form.costBasis} onChangeText={(v) => update('costBasis', v)} keyboardType="numeric" /></FormField>
        <FormField style={{ flex: 1 }} label="Market Value" required><Input value={form.marketValue} onChangeText={(v) => update('marketValue', v)} keyboardType="numeric" /></FormField>
      </View>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Yield %"><Input value={form.yieldRate} onChangeText={(v) => update('yieldRate', v)} keyboardType="numeric" /></FormField>
        <FormField style={{ flex: 1 }} label="Duration (yrs)"><Input value={form.durationYears} onChangeText={(v) => update('durationYears', v)} keyboardType="numeric" /></FormField>
      </View>
      <FormField label="Regulatory Limit %"><Input value={form.regulatoryLimitPct} onChangeText={(v) => update('regulatoryLimitPct', v)} keyboardType="numeric" placeholder="25" /></FormField>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Add Holding" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

function RevalueModal({ investment, onClose, onSaved }: { investment: Investment | null; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investment) setValue(investment.marketValue);
  }, [investment]);

  if (!investment) return null;

  const submit = async () => {
    setSaving(true);
    try {
      await addValuation(investment.id, { marketValue: Number(value), valuationDate: new Date().toISOString().slice(0, 10) });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!investment} onClose={onClose} title={`Revalue — ${investment.assetName}`} width={420}>
      <FormField label="New Market Value">
        <Input value={value} onChangeText={setValue} keyboardType="numeric" />
      </FormField>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Update Valuation" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cardLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  allocGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  allocItem: { minWidth: 200, flexGrow: 1 },
  allocClass: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  allocPct: { ...typography.h3, color: colors.textPrimary, marginBottom: 6 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  allocLimit: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
