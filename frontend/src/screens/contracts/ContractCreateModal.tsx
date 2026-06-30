import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal } from '@/components/Modal';
import { FormField, Input, SelectField } from '@/components/FormField';
import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/theme/theme';
import { createContract } from '@/api/contracts.api';
import { entitiesApi, partiesApi } from '@/api/parties.api';
import { Entity, Party } from '@/types/models';
import { getApiErrorMessage } from '@/api/client';

const KIND_OPTIONS = [
  { label: 'Treaty', value: 'TREATY' },
  { label: 'Facultative', value: 'FACULTATIVE' },
];
const DIRECTION_OPTIONS = [
  { label: 'Inward', value: 'INWARD' },
  { label: 'Outward', value: 'OUTWARD' },
];
const TREATY_TYPE_OPTIONS = [
  { label: 'Quota Share', value: 'QUOTA_SHARE' },
  { label: 'Surplus Share', value: 'SURPLUS_SHARE' },
  { label: 'Excess of Loss', value: 'EXCESS_OF_LOSS' },
  { label: 'Catastrophe XL', value: 'CATASTROPHE_XL' },
  { label: 'Stop Loss', value: 'STOP_LOSS' },
  { label: 'Fac Proportional', value: 'FACULTATIVE_PROPORTIONAL' },
  { label: 'Fac Non-Proportional', value: 'FACULTATIVE_NON_PROPORTIONAL' },
];

export function ContractCreateModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    contractNumber: '',
    name: '',
    direction: 'INWARD',
    kind: 'TREATY',
    treatyType: 'EXCESS_OF_LOSS',
    entityId: '',
    inceptionDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    currency: 'USD',
    retention: '',
    limit: '',
    brokeragePct: '',
    profitCommissionPct: '',
    totalCapacity: '',
    partyId: '',
    partyRole: 'CEDENT',
  });

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const [e, p] = await Promise.all([entitiesApi.list({ pageSize: 50 }), partiesApi.list({ pageSize: 100 })]);
      setEntities(e.items);
      setParties(p.items);
      setForm((f) => ({ ...f, entityId: e.items[0]?.id || '' }));
    })();
  }, [visible]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.contractNumber || !form.name || !form.entityId || !form.partyId) {
      setError('Please fill in contract number, name, entity, and counterparty.');
      return;
    }
    setSaving(true);
    try {
      await createContract({
        contractNumber: form.contractNumber,
        name: form.name,
        direction: form.direction,
        kind: form.kind,
        treatyType: form.treatyType,
        entityId: form.entityId,
        inceptionDate: form.inceptionDate,
        expiryDate: form.expiryDate,
        currency: form.currency,
        retention: form.retention ? Number(form.retention) : undefined,
        limit: form.limit ? Number(form.limit) : undefined,
        brokeragePct: form.brokeragePct ? Number(form.brokeragePct) : undefined,
        profitCommissionPct: form.profitCommissionPct ? Number(form.profitCommissionPct) : undefined,
        totalCapacity: form.totalCapacity ? Number(form.totalCapacity) : undefined,
        parties: [{ partyId: form.partyId, role: form.partyRole }],
      });
      onCreated();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New Treaty / Facultative Contract" width={640}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        <FormField style={{ flex: 1 }} label="Contract Number" required>
          <Input value={form.contractNumber} onChangeText={(v) => update('contractNumber', v)} placeholder="TRTY-2026-003" />
        </FormField>
        <FormField style={{ flex: 1 }} label="Contract Name" required>
          <Input value={form.name} onChangeText={(v) => update('name', v)} placeholder="e.g. Property Cat XL 2026" />
        </FormField>
      </View>

      <FormField style={{ flex: 1 }} label="Direction">
        <SelectField value={form.direction} options={DIRECTION_OPTIONS} onChange={(v) => update('direction', v)} />
      </FormField>
      <FormField style={{ flex: 1 }} label="Kind">
        <SelectField value={form.kind} options={KIND_OPTIONS} onChange={(v) => update('kind', v)} />
      </FormField>
      <FormField style={{ flex: 1 }} label="Treaty Type">
        <SelectField value={form.treatyType} options={TREATY_TYPE_OPTIONS} onChange={(v) => update('treatyType', v)} />
      </FormField>

      <FormField style={{ flex: 1 }} label="Entity" required>
        <SelectField value={form.entityId} options={entities.map((e) => ({ label: e.name, value: e.id }))} onChange={(v) => update('entityId', v)} />
      </FormField>

      <View style={styles.grid}>
        <FormField style={{ flex: 1 }} label="Counterparty" required>
          <SelectField value={form.partyId} options={parties.map((p) => ({ label: p.name, value: p.id }))} onChange={(v) => update('partyId', v)} />
        </FormField>
        <FormField style={{ flex: 1 }} label="Counterparty Role">
          <SelectField
            value={form.partyRole}
            options={[
              { label: 'Cedent', value: 'CEDENT' },
              { label: 'Reinsurer', value: 'REINSURER' },
              { label: 'Broker', value: 'BROKER' },
              { label: 'Retrocessionaire', value: 'RETROCESSIONAIRE' },
            ]}
            onChange={(v) => update('partyRole', v)}
          />
        </FormField>
      </View>

      <View style={styles.grid}>
        <FormField style={{ flex: 1 }} label="Inception Date">
          <Input value={form.inceptionDate} onChangeText={(v) => update('inceptionDate', v)} placeholder="YYYY-MM-DD" />
        </FormField>
        <FormField style={{ flex: 1 }} label="Expiry Date">
          <Input value={form.expiryDate} onChangeText={(v) => update('expiryDate', v)} placeholder="YYYY-MM-DD" />
        </FormField>
      </View>

      <View style={styles.grid}>
        <FormField style={{ flex: 1 }} label="Currency">
          <Input value={form.currency} onChangeText={(v) => update('currency', v)} placeholder="USD" />
        </FormField>
        <FormField style={{ flex: 1 }} label="Total Capacity">
          <Input value={form.totalCapacity} onChangeText={(v) => update('totalCapacity', v)} keyboardType="numeric" placeholder="20000000" />
        </FormField>
      </View>

      <View style={styles.grid}>
        <FormField style={{ flex: 1 }} label="Retention">
          <Input value={form.retention} onChangeText={(v) => update('retention', v)} keyboardType="numeric" placeholder="5000000" />
        </FormField>
        <FormField style={{ flex: 1 }} label="Limit">
          <Input value={form.limit} onChangeText={(v) => update('limit', v)} keyboardType="numeric" placeholder="20000000" />
        </FormField>
      </View>

      <View style={styles.grid}>
        <FormField style={{ flex: 1 }} label="Brokerage %">
          <Input value={form.brokeragePct} onChangeText={(v) => update('brokeragePct', v)} keyboardType="numeric" placeholder="10" />
        </FormField>
        <FormField style={{ flex: 1 }} label="Profit Commission %">
          <Input value={form.profitCommissionPct} onChangeText={(v) => update('profitCommissionPct', v)} keyboardType="numeric" placeholder="15" />
        </FormField>
      </View>

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Create Contract" onPress={handleSubmit} loading={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  error: {
    ...typography.small,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
