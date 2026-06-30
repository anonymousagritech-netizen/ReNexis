import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { FormField, Input, SelectField } from '@/components/FormField';
import { colors, spacing, moduleColors } from '@/theme/theme';
import { partiesApi, updatePartyKyc } from '@/api/parties.api';
import { Party } from '@/types/models';
import { getApiErrorMessage } from '@/api/client';

const TYPE_OPTIONS = [
  { label: 'Cedent', value: 'CEDENT' },
  { label: 'Broker', value: 'BROKER' },
  { label: 'Reinsurer', value: 'REINSURER' },
  { label: 'Retrocessionaire', value: 'RETROCESSIONAIRE' },
];

export function PartiesScreen() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [kycTarget, setKycTarget] = useState<Party | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partiesApi.list({ pageSize: 100 });
      setParties(res.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<Party>[] = [
    { key: 'name', header: 'Name', width: 240, render: (r) => r.name },
    { key: 'type', header: 'Type', width: 160, render: (r) => r.type },
    { key: 'country', header: 'Country', width: 140, render: (r) => r.country },
    { key: 'creditRating', header: 'Rating', width: 90, render: (r) => r.creditRating || '—' },
    { key: 'kycStatus', header: 'KYC', width: 130, render: (r) => <Badge label={r.kycStatus} /> },
    { key: 'amlRiskRating', header: 'AML Risk', width: 110, render: (r) => <Badge label={r.amlRiskRating} status={r.amlRiskRating === 'HIGH' ? 'FAIL' : r.amlRiskRating === 'MEDIUM' ? 'PENDING' : 'PASS'} /> },
    {
      key: 'actions',
      header: '',
      width: 120,
      render: (r) => <Button label="Review KYC" variant="ghost" small onPress={() => setKycTarget(r)} />,
    },
  ];

  return (
    <View>
      <ScreenHeader accentColor={moduleColors.reinsurance.main}         title="Counterparties"
        subtitle="Cedents, brokers, reinsurers & retrocessionaires"
        actions={<Button label="+ New Party" onPress={() => setCreateOpen(true)} />}
      />
      <Card>
        <DataTable columns={columns} data={parties} loading={loading} emptyMessage="No counterparties yet." />
      </Card>

      <PartyCreateModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchData(); }} />
      <KycModal party={kycTarget} onClose={() => setKycTarget(null)} onSaved={() => { setKycTarget(null); fetchData(); }} />
    </View>
  );
}

function PartyCreateModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'CEDENT', country: '', currency: 'USD', creditRating: '', contactEmail: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.country) {
      setError('Name and country are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await partiesApi.create(form as any);
      onCreated();
      setForm({ name: '', type: 'CEDENT', country: '', currency: 'USD', creditRating: '', contactEmail: '' });
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New Counterparty">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Name" required><Input value={form.name} onChangeText={(v) => update('name', v)} placeholder="Company name" /></FormField>
      <FormField label="Type"><SelectField value={form.type} options={TYPE_OPTIONS} onChange={(v) => update('type', v)} /></FormField>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Country" required><Input value={form.country} onChangeText={(v) => update('country', v)} placeholder="Singapore" /></FormField>
        <FormField style={{ flex: 1 }} label="Currency"><Input value={form.currency} onChangeText={(v) => update('currency', v)} placeholder="USD" /></FormField>
      </View>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Credit Rating"><Input value={form.creditRating} onChangeText={(v) => update('creditRating', v)} placeholder="A-" /></FormField>
        <FormField style={{ flex: 1 }} label="Contact Email"><Input value={form.contactEmail} onChangeText={(v) => update('contactEmail', v)} placeholder="contact@company.com" /></FormField>
      </View>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Create" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

function KycModal({ party, onClose, onSaved }: { party: Party | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  if (!party) return null;

  const decide = async (status: string) => {
    setSaving(true);
    try {
      await updatePartyKyc(party.id, status, status === 'REJECTED' ? 'HIGH' : undefined);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!party} onClose={onClose} title={`KYC Review — ${party.name}`} width={420}>
      <FormField label="Current Status"><Badge label={party.kycStatus} /></FormField>
      <FormField label="Registration No."><Text style={{ color: '#EAF0FB' }}>{party.registrationNo || '—'}</Text></FormField>
      <View style={styles.actions}>
        <Button label="Reject" variant="danger" small onPress={() => decide('REJECTED')} loading={saving} />
        <Button label="Verify" small onPress={() => decide('VERIFIED')} loading={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});
