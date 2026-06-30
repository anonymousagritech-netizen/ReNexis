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
import { listClaims, createClaim, adjustReserve, recordPayment, requestCashCall } from '@/api/claims.api';
import { listContracts } from '@/api/contracts.api';
import { Claim, Contract } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { getApiErrorMessage } from '@/api/client';

export function ClaimsScreen({ params }: { params?: Record<string, any> }) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Claim | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listClaims({ pageSize: 100 });
      setClaims(res.claims);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<Claim>[] = [
    { key: 'claimNumber', header: 'Claim #', width: 180, render: (r) => r.claimNumber },
    { key: 'dateOfLoss', header: 'Date of Loss', width: 120, render: (r) => formatDate(r.dateOfLoss) },
    { key: 'grossIncurred', header: 'Gross Incurred', width: 150, render: (r) => formatCurrency(r.grossIncurred, r.currency) },
    { key: 'reserveAmount', header: 'Reserve', width: 140, render: (r) => formatCurrency(r.reserveAmount, r.currency) },
    { key: 'recoveryAmount', header: 'Recovery', width: 140, render: (r) => formatCurrency(r.recoveryAmount, r.currency) },
    { key: 'paidAmount', header: 'Paid', width: 130, render: (r) => formatCurrency(r.paidAmount, r.currency) },
    { key: 'status', header: 'Status', width: 140, render: (r) => <Badge label={r.status} /> },
  ];

  return (
    <View>
      <ScreenHeader
        title="Claims & Recoveries"
        subtitle="RBNS / IBNR reserves, layer recoveries, cash calls"
        actions={<Button label="+ Notify Claim" onPress={() => setCreateOpen(true)} />}
      />
      <Card>
        <DataTable columns={columns} data={claims} loading={loading} onRowPress={setSelected} emptyMessage="No claims notified yet." />
      </Card>

      <ClaimCreateModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchData(); }} />
      <ClaimDetailModal claim={selected} onClose={() => setSelected(null)} onChanged={() => { fetchData(); }} />
    </View>
  );
}

function ClaimCreateModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState({ contractId: '', dateOfLoss: new Date().toISOString().slice(0, 10), grossIncurred: '', currency: 'USD', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!visible) return;
    listContracts({ pageSize: 100 }).then((res) => {
      setContracts(res.contracts);
      setForm((f) => ({ ...f, contractId: res.contracts[0]?.id || '' }));
    });
  }, [visible]);

  const submit = async () => {
    if (!form.contractId || !form.grossIncurred) {
      setError('Contract and gross incurred amount are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createClaim({ ...form, grossIncurred: Number(form.grossIncurred) });
      onCreated();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Notify New Claim" width={520}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Contract" required>
        <SelectField value={form.contractId} options={contracts.map((c) => ({ label: c.contractNumber, value: c.id }))} onChange={(v) => update('contractId', v)} />
      </FormField>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Date of Loss"><Input value={form.dateOfLoss} onChangeText={(v) => update('dateOfLoss', v)} placeholder="YYYY-MM-DD" /></FormField>
        <FormField style={{ flex: 1 }} label="Currency"><Input value={form.currency} onChangeText={(v) => update('currency', v)} placeholder="USD" /></FormField>
      </View>
      <FormField label="Gross Incurred (initial reserve)" required>
        <Input value={form.grossIncurred} onChangeText={(v) => update('grossIncurred', v)} keyboardType="numeric" placeholder="9500000" />
      </FormField>
      <FormField label="Description">
        <Input value={form.description} onChangeText={(v) => update('description', v)} multiline placeholder="Loss details, location, cause..." />
      </FormField>
      <Text style={styles.hint}>Layer recovery is calculated automatically per the treaty's retention/limit terms on submission.</Text>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Notify Claim" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

function ClaimDetailModal({ claim, onClose, onChanged }: { claim: Claim | null; onClose: () => void; onChanged: () => void }) {
  const [reserveInput, setReserveInput] = useState('');
  const [paymentInput, setPaymentInput] = useState('');
  const [cashCallInput, setCashCallInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (claim) {
      setReserveInput(claim.reserveAmount);
      setPaymentInput('');
      setCashCallInput('');
      setError(null);
    }
  }, [claim]);

  if (!claim) return null;

  const handleReserve = async () => {
    setSaving(true);
    setError(null);
    try {
      await adjustReserve(claim.id, Number(reserveInput));
      onChanged();
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    setSaving(true);
    setError(null);
    try {
      await recordPayment(claim.id, Number(paymentInput));
      onChanged();
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCashCall = async () => {
    setSaving(true);
    setError(null);
    try {
      await requestCashCall(claim.id, Number(cashCallInput));
      onChanged();
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!claim} onClose={onClose} title={claim.claimNumber} width={560}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.summaryRow}>
        <SummaryItem label="Status" value={<Badge label={claim.status} />} />
        <SummaryItem label="Recovery" value={<Text style={styles.summaryValue}>{formatCurrency(claim.recoveryAmount, claim.currency)}</Text>} />
        <SummaryItem label="Paid" value={<Text style={styles.summaryValue}>{formatCurrency(claim.paidAmount, claim.currency)}</Text>} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adjust Reserve (RBNS / IBNR)</Text>
        <View style={styles.row}>
          <Input value={reserveInput} onChangeText={setReserveInput} keyboardType="numeric" placeholder="New reserve amount" />
          <Button label="Update" small onPress={handleReserve} loading={saving} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Record Payment</Text>
        <View style={styles.row}>
          <Input value={paymentInput} onChangeText={setPaymentInput} keyboardType="numeric" placeholder="Payment amount" />
          <Button label="Pay" small onPress={handlePayment} loading={saving} disabled={!paymentInput} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cash Call (large loss)</Text>
        <View style={styles.row}>
          <Input value={cashCallInput} onChangeText={setCashCallInput} keyboardType="numeric" placeholder="Cash call amount" />
          <Button label="Request" small variant="secondary" onPress={handleCashCall} loading={saving} disabled={!cashCallInput} />
        </View>
        {claim.cashCallStatus ? <Text style={styles.hint}>Current cash call status: {claim.cashCallStatus}</Text> : null}
      </View>
    </Modal>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      {value}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  hint: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  summaryRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg, flexWrap: 'wrap' },
  summaryItem: { gap: 4 },
  summaryLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  summaryValue: { ...typography.bodyMedium, color: colors.textPrimary },
  section: { marginBottom: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.sm },
});
