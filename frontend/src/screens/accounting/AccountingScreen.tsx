import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { FormField, Input, SelectField } from '@/components/FormField';
import { colors, spacing, typography } from '@/theme/theme';
import { listSOA, generateSOA, issueSOA, settleSOA, getAgingReport, runFxRevaluation } from '@/api/accounting.api';
import { listContracts } from '@/api/contracts.api';
import { StatementOfAccount, Contract } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { getApiErrorMessage } from '@/api/client';

export function AccountingScreen() {
  const [tab, setTab] = useState<'soa' | 'aging'>('soa');
  const [statements, setStatements] = useState<StatementOfAccount[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [revaluing, setRevaluing] = useState(false);
  const [revalueResult, setRevalueResult] = useState<number | null>(null);

  const handleRunRevaluation = async () => {
    setRevaluing(true);
    try {
      const res = await runFxRevaluation();
      setRevalueResult(res.revaluedCount);
      await fetchData();
    } finally {
      setRevaluing(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [soaRes, agingRes] = await Promise.all([listSOA({ pageSize: 100 }), getAgingReport()]);
      setStatements(soaRes.statements);
      setAging(agingRes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const soaColumns: Column<StatementOfAccount>[] = [
    { key: 'contract', header: 'Contract', width: 200, render: (r) => r.contract?.contractNumber || '—' },
    { key: 'periodStart', header: 'Period', width: 200, render: (r) => `${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}` },
    { key: 'premiumIn', header: 'Premium In', width: 130, render: (r) => formatCurrency(r.premiumIn, r.currency) },
    { key: 'claimsOut', header: 'Claims Out', width: 130, render: (r) => formatCurrency(r.claimsOut, r.currency) },
    { key: 'commission', header: 'Commission', width: 130, render: (r) => formatCurrency(r.commission, r.currency) },
    { key: 'balance', header: 'Balance', width: 140, render: (r) => formatCurrency(r.balance, r.currency) },
    { key: 'status', header: 'Status', width: 120, render: (r) => <Badge label={r.status} /> },
    {
      key: 'actions',
      header: '',
      width: 160,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {r.status === 'DRAFT' && <Button label="Issue" small variant="ghost" onPress={async () => { await issueSOA(r.id); fetchData(); }} />}
          {r.status === 'ISSUED' && <Button label="Settle" small variant="ghost" onPress={async () => { await settleSOA(r.id); fetchData(); }} />}
        </View>
      ),
    },
  ];

  return (
    <View>
      <ScreenHeader
        title="Technical / Business Accounting"
        subtitle="Statement of Account, current account, aging & reconciliation"
        actions={
          <>
            <Button label={revaluing ? 'Revaluing…' : 'Run FX Revaluation'} variant="secondary" onPress={handleRunRevaluation} loading={revaluing} />
            <Button label="+ Generate SOA" onPress={() => setGenerateOpen(true)} />
          </>
        }
      />
      {revalueResult !== null && (
        <Text style={styles.hint}>FX revaluation complete — {revalueResult} open foreign-currency balance{revalueResult === 1 ? '' : 's'} revalued and posted to the ledger.</Text>
      )}

      <View style={styles.tabs}>
        <SelectField
          value={tab}
          options={[{ label: 'Statements of Account', value: 'soa' }, { label: 'Current Account Aging', value: 'aging' }]}
          onChange={(v) => setTab(v as any)}
        />
      </View>

      {tab === 'soa' ? (
        <Card>
          <DataTable columns={soaColumns} data={statements} loading={loading} emptyMessage="No statements generated yet." />
        </Card>
      ) : (
        <Card>
          {aging.length === 0 ? (
            <Text style={styles.muted}>No outstanding current account balances.</Text>
          ) : (
            aging.map((a, idx) => (
              <View key={idx} style={styles.agingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.agingName}>{a.party.name}</Text>
                  <Text style={styles.agingMeta}>{a.daysOutstanding} days outstanding</Text>
                </View>
                <Text style={[styles.agingAmount, a.outstanding < 0 && { color: colors.danger }]}>{formatCurrency(a.outstanding)}</Text>
              </View>
            ))
          )}
        </Card>
      )}

      <GenerateSOAModal visible={generateOpen} onClose={() => setGenerateOpen(false)} onGenerated={() => { setGenerateOpen(false); fetchData(); }} />
    </View>
  );
}

function GenerateSOAModal({ visible, onClose, onGenerated }: { visible: boolean; onClose: () => void; onGenerated: () => void }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractId, setContractId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState('2026-12-31');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ lossRatioPct: number } | null>(null);

  useEffect(() => {
    if (!visible) return;
    listContracts({ pageSize: 100 }).then((res) => {
      setContracts(res.contracts);
      setContractId(res.contracts[0]?.id || '');
    });
  }, [visible]);

  const submit = async () => {
    if (!contractId) {
      setError('Select a contract.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await generateSOA(contractId, periodStart, periodEnd);
      setPreview({ lossRatioPct: res.lossRatioPct });
      onGenerated();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Generate Statement of Account" width={480}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Contract" required>
        <SelectField value={contractId} options={contracts.map((c) => ({ label: c.contractNumber, value: c.id }))} onChange={setContractId} />
      </FormField>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Period Start"><Input value={periodStart} onChangeText={setPeriodStart} placeholder="YYYY-MM-DD" /></FormField>
        <FormField style={{ flex: 1 }} label="Period End"><Input value={periodEnd} onChangeText={setPeriodEnd} placeholder="YYYY-MM-DD" /></FormField>
      </View>
      {preview && <Text style={styles.hint}>Generated. Period loss ratio: {preview.lossRatioPct.toFixed(1)}%</Text>}
      <View style={styles.actions}>
        <Button label="Close" variant="secondary" onPress={onClose} />
        <Button label="Generate" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tabs: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  hint: { ...typography.small, color: colors.success, marginTop: spacing.xs },
  muted: { ...typography.body, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  agingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  agingName: { ...typography.bodyMedium, color: colors.textPrimary },
  agingMeta: { ...typography.small, color: colors.textMuted },
  agingAmount: { ...typography.bodyMedium, color: colors.textPrimary },
});
