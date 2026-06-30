import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { FormField, Input, SelectField } from '@/components/FormField';
import { colors, spacing, typography } from '@/theme/theme';
import { listGLAccounts, createGLAccount, getTrialBalance } from '@/api/gl.api';
import { entitiesApi } from '@/api/parties.api';
import { GLAccount, Entity } from '@/types/models';
import { formatCurrency } from '@/utils/format';
import { getApiErrorMessage } from '@/api/client';

const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Asset', value: 'ASSET' },
  { label: 'Liability', value: 'LIABILITY' },
  { label: 'Equity', value: 'EQUITY' },
  { label: 'Income', value: 'INCOME' },
  { label: 'Expense', value: 'EXPENSE' },
];

export function GLScreen() {
  const [tab, setTab] = useState<'accounts' | 'trial-balance'>('accounts');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState('');
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [trialBalance, setTrialBalance] = useState<{ accounts: any[]; totalDebit: number; totalCredit: number; balanced: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    entitiesApi.list({ pageSize: 50 }).then((res) => {
      setEntities(res.items);
      setEntityId(res.items[0]?.id || '');
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [acc, tb] = await Promise.all([listGLAccounts(entityId), getTrialBalance(entityId)]);
      setAccounts(acc);
      setTrialBalance(tb);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const accountColumns: Column<GLAccount>[] = [
    { key: 'code', header: 'Code', width: 100, render: (r) => r.code },
    { key: 'name', header: 'Account Name', width: 280, render: (r) => r.name },
    { key: 'type', header: 'Type', width: 140, render: (r) => r.type },
  ];

  return (
    <View>
      <ScreenHeader
        title="General Ledger"
        subtitle="Module 6 · Chart of accounts, double-entry journal, trial balance"
        actions={<Button label="+ New Account" onPress={() => setCreateOpen(true)} />}
      />

      {entities.length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.cardLabel}>Entity</Text>
          <SelectField value={entityId} options={entities.map((e) => ({ label: e.name, value: e.id }))} onChange={setEntityId} />
        </Card>
      )}

      <View style={{ marginBottom: spacing.lg }}>
        <SelectField
          value={tab}
          options={[{ label: 'Chart of Accounts', value: 'accounts' }, { label: 'Trial Balance', value: 'trial-balance' }]}
          onChange={(v) => setTab(v as any)}
        />
      </View>

      {tab === 'accounts' ? (
        <Card>
          <DataTable columns={accountColumns} data={accounts} loading={loading} emptyMessage="No GL accounts yet. Set up a chart of accounts to begin posting." />
        </Card>
      ) : (
        <Card>
          {trialBalance && (
            <>
              <View style={styles.tbHeader}>
                <Text style={styles.tbHeaderText}>Account</Text>
                <Text style={styles.tbHeaderText}>Debit</Text>
                <Text style={styles.tbHeaderText}>Credit</Text>
              </View>
              {trialBalance.accounts.map((a, idx) => (
                <View key={idx} style={styles.tbRow}>
                  <Text style={styles.tbCellName}>{a.accountCode} · {a.accountName}</Text>
                  <Text style={styles.tbCell}>{a.debit ? formatCurrency(a.debit) : '—'}</Text>
                  <Text style={styles.tbCell}>{a.credit ? formatCurrency(a.credit) : '—'}</Text>
                </View>
              ))}
              <View style={styles.tbTotalRow}>
                <Text style={styles.tbTotalLabel}>Total</Text>
                <Text style={styles.tbTotalValue}>{formatCurrency(trialBalance.totalDebit)}</Text>
                <Text style={styles.tbTotalValue}>{formatCurrency(trialBalance.totalCredit)}</Text>
              </View>
              <Text style={[styles.balanceStatus, { color: trialBalance.balanced ? colors.success : colors.danger }]}>
                {trialBalance.balanced ? '✓ Books are balanced' : '⚠ Books are out of balance'}
              </Text>
            </>
          )}
        </Card>
      )}

      <AccountCreateModal visible={createOpen} entityId={entityId} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchData(); }} />
    </View>
  );
}

function AccountCreateModal({ visible, entityId, onClose, onCreated }: { visible: boolean; entityId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', type: 'ASSET' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.code || !form.name || !entityId) {
      setError('Code, name, and entity are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createGLAccount({ ...form, entityId });
      onCreated();
      setForm({ code: '', name: '', type: 'ASSET' });
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New GL Account" width={420}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Account Code" required><Input value={form.code} onChangeText={(v) => update('code', v)} placeholder="1000" /></FormField>
      <FormField label="Account Name" required><Input value={form.name} onChangeText={(v) => update('name', v)} placeholder="Cash and Bank" /></FormField>
      <FormField label="Type"><SelectField value={form.type} options={ACCOUNT_TYPE_OPTIONS} onChange={(v) => update('type', v)} /></FormField>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Create" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cardLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  tbHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  tbHeaderText: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  tbRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  tbCellName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  tbCell: { ...typography.body, color: colors.textSecondary, width: 120, textAlign: 'right' },
  tbTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  tbTotalLabel: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  tbTotalValue: { ...typography.bodyMedium, color: colors.textPrimary, width: 120, textAlign: 'right' },
  balanceStatus: { ...typography.bodyMedium, textAlign: 'center', marginTop: spacing.sm },
});
