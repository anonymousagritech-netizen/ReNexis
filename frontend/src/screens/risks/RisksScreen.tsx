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
import { listRisks, createRisk, getAccumulationByZone, decideSpecialAcceptance } from '@/api/risks.api';
import { listContracts } from '@/api/contracts.api';
import { Risk, Contract } from '@/types/models';
import { formatCurrency } from '@/utils/format';
import { getApiErrorMessage } from '@/api/client';

export function RisksScreen() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [accumulation, setAccumulation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Risk | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, acc] = await Promise.all([listRisks({ pageSize: 100 }), getAccumulationByZone()]);
      setRisks(r.risks);
      setAccumulation(acc);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<Risk>[] = [
    { key: 'riskRef', header: 'Risk Ref', width: 150, render: (r) => r.riskRef },
    { key: 'peril', header: 'Peril', width: 120, render: (r) => r.peril || '-' },
    { key: 'catZone', header: 'Cat Zone', width: 120, render: (r) => r.catZone || '-' },
    { key: 'sumInsured', header: 'Sum Insured', width: 150, render: (r) => formatCurrency(r.sumInsured, r.currency) },
    { key: 'allocatedAmount', header: 'Allocated', width: 150, render: (r) => formatCurrency(r.allocatedAmount, r.currency) },
    {
      key: 'status',
      header: 'Acceptance',
      width: 160,
      render: (r) =>
        r.specialAcceptanceStatus ? (
          <Badge label={r.specialAcceptanceStatus} />
        ) : (
          <Badge label="AUTO" status="VERIFIED" />
        ),
    },
    {
      key: 'actions',
      header: '',
      width: 140,
      render: (r) =>
        r.specialAcceptanceStatus === 'PENDING' ? (
          <Button label="Review" variant="ghost" small onPress={() => setReviewTarget(r)} />
        ) : (
          <Text style={{ color: colors.textMuted }}>-</Text>
        ),
    },
  ];

  return (
    <View>
      <ScreenHeader accentColor={moduleColors.reinsurance.main}         title="Risks & Underwriting"
        subtitle="Risk capture, treaty capacity allocation, catastrophe accumulation"
        actions={<Button label="+ Capture Risk" onPress={() => setCreateOpen(true)} />}
      />

      {accumulation.length > 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardLabel}>Catastrophe Accumulation by Zone</Text>
          <View style={styles.accGrid}>
            {accumulation.map((a, idx) => (
              <View key={idx} style={styles.accItem}>
                <Text style={styles.accZone}>{a.catZone} · {a.peril}</Text>
                <Text style={styles.accValue}>{formatCurrency(a._sum.sumInsured)}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card>
        <DataTable columns={columns} data={risks} loading={loading} emptyMessage="No risks captured yet." />
      </Card>

      <RiskCreateModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchData(); }} />
      <SpecialAcceptanceModal risk={reviewTarget} onClose={() => setReviewTarget(null)} onDecided={() => { setReviewTarget(null); fetchData(); }} />
    </View>
  );
}

function RiskCreateModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState({
    contractId: '', riskRef: '', sumInsured: '', premiumAmount: '', currency: 'USD', catZone: '', peril: '',
    inceptionDate: new Date().toISOString().slice(0, 10), expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  });
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
    if (!form.contractId || !form.riskRef || !form.sumInsured) {
      setError('Contract, risk reference, and sum insured are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await createRisk({
        ...form,
        sumInsured: Number(form.sumInsured),
        premiumAmount: Number(form.premiumAmount || 0),
      });
      onCreated();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Capture New Risk" width={560}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Contract" required>
        <SelectField value={form.contractId} options={contracts.map((c) => ({ label: c.contractNumber, value: c.id }))} onChange={(v) => update('contractId', v)} />
      </FormField>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Risk Reference" required><Input value={form.riskRef} onChangeText={(v) => update('riskRef', v)} placeholder="POL-00123" /></FormField>
        <FormField style={{ flex: 1 }} label="Currency"><Input value={form.currency} onChangeText={(v) => update('currency', v)} placeholder="USD" /></FormField>
      </View>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Sum Insured" required><Input value={form.sumInsured} onChangeText={(v) => update('sumInsured', v)} keyboardType="numeric" placeholder="8000000" /></FormField>
        <FormField style={{ flex: 1 }} label="Premium Amount"><Input value={form.premiumAmount} onChangeText={(v) => update('premiumAmount', v)} keyboardType="numeric" placeholder="120000" /></FormField>
      </View>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Cat Zone"><Input value={form.catZone} onChangeText={(v) => update('catZone', v)} placeholder="PH-LUZON" /></FormField>
        <FormField style={{ flex: 1 }} label="Peril"><Input value={form.peril} onChangeText={(v) => update('peril', v)} placeholder="WINDSTORM" /></FormField>
      </View>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Capture Risk" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

function SpecialAcceptanceModal({ risk, onClose, onDecided }: { risk: Risk | null; onClose: () => void; onDecided: () => void }) {
  const [saving, setSaving] = useState(false);
  if (!risk) return null;

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    setSaving(true);
    try {
      await decideSpecialAcceptance(risk.id, decision);
      onDecided();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!risk} onClose={onClose} title="Special Acceptance Review" width={420}>
      <Text style={styles.bodyText}>
        Risk {risk.riskRef} (sum insured {formatCurrency(risk.sumInsured, risk.currency)}) exceeds the treaty's automatic capacity and requires manual approval.
      </Text>
      <View style={styles.actions}>
        <Button label="Reject" variant="danger" small onPress={() => decide('REJECTED')} loading={saving} />
        <Button label="Approve" small onPress={() => decide('APPROVED')} loading={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cardLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  accGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  accItem: { backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: 10, minWidth: 180 },
  accZone: { ...typography.small, color: colors.textSecondary, marginBottom: 4 },
  accValue: { ...typography.h3, color: colors.textPrimary },
  bodyText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
});
