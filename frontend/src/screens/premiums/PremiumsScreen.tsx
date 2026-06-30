import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { FormField, Input, SelectField } from '@/components/FormField';
import { colors, spacing, typography } from '@/theme/theme';
import { listPremiums, createPremium, uploadBordereaux } from '@/api/premiums.api';
import { listContracts } from '@/api/contracts.api';
import { PremiumTransaction, Contract } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { getApiErrorMessage } from '@/api/client';

export function PremiumsScreen() {
  const [premiums, setPremiums] = useState<PremiumTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPremiums({ pageSize: 100 });
      setPremiums(res.premiums);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<PremiumTransaction>[] = [
    { key: 'contract', header: 'Contract', width: 200, render: (r) => r.contract?.contractNumber || '—' },
    { key: 'transactionDate', header: 'Date', width: 120, render: (r) => formatDate(r.transactionDate) },
    { key: 'grossPremium', header: 'Gross Premium', width: 150, render: (r) => formatCurrency(r.grossPremium, r.currency) },
    { key: 'brokerage', header: 'Brokerage', width: 130, render: (r) => formatCurrency(r.brokerage, r.currency) },
    { key: 'commission', header: 'Commission', width: 130, render: (r) => formatCurrency(r.commission, r.currency) },
    { key: 'netPremium', header: 'Net Premium', width: 150, render: (r) => formatCurrency(r.netPremium, r.currency) },
    { key: 'status', header: 'Status', width: 120, render: (r) => <Badge label={r.status} /> },
  ];

  return (
    <View>
      <ScreenHeader
        title="Premiums & Bordereaux"
        subtitle="Premium booking and cedent bordereaux ingestion"
        actions={
          <>
            <Button label="Upload Bordereaux" variant="secondary" onPress={() => setUploadOpen(true)} />
            <Button label="+ Book Premium" onPress={() => setCreateOpen(true)} />
          </>
        }
      />
      <Card>
        <DataTable columns={columns} data={premiums} loading={loading} emptyMessage="No premium transactions yet." />
      </Card>

      <PremiumCreateModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchData(); }} />
      <BordereauxUploadModal visible={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={() => { setUploadOpen(false); fetchData(); }} />
    </View>
  );
}

function PremiumCreateModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState({ contractId: '', transactionDate: new Date().toISOString().slice(0, 10), grossPremium: '', brokerage: '0', commission: '0', currency: 'USD' });
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
    if (!form.contractId || !form.grossPremium) {
      setError('Contract and gross premium are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPremium({
        ...form,
        grossPremium: Number(form.grossPremium),
        brokerage: Number(form.brokerage),
        commission: Number(form.commission),
      });
      onCreated();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Book Premium Transaction" width={520}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Contract" required>
        <SelectField value={form.contractId} options={contracts.map((c) => ({ label: c.contractNumber, value: c.id }))} onChange={(v) => update('contractId', v)} />
      </FormField>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Transaction Date"><Input value={form.transactionDate} onChangeText={(v) => update('transactionDate', v)} placeholder="YYYY-MM-DD" /></FormField>
        <FormField style={{ flex: 1 }} label="Currency"><Input value={form.currency} onChangeText={(v) => update('currency', v)} placeholder="USD" /></FormField>
      </View>
      <FormField label="Gross Premium" required>
        <Input value={form.grossPremium} onChangeText={(v) => update('grossPremium', v)} keyboardType="numeric" placeholder="1800000" />
      </FormField>
      <View style={styles.row}>
        <FormField style={{ flex: 1 }} label="Brokerage"><Input value={form.brokerage} onChangeText={(v) => update('brokerage', v)} keyboardType="numeric" /></FormField>
        <FormField style={{ flex: 1 }} label="Commission"><Input value={form.commission} onChangeText={(v) => update('commission', v)} keyboardType="numeric" /></FormField>
      </View>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Book Premium" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

function BordereauxUploadModal({ visible, onClose, onUploaded }: { visible: boolean; onClose: () => void; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ successCount: number; errors: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadBordereaux(file, file.name);
      setResult({ successCount: res.successCount, errors: res.errors });
      onUploaded();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Upload Premium Bordereaux" width={480}>
      <Text style={styles.hint}>
        Upload a cedent Excel (.xlsx) bordereaux file. Expected columns: contractNumber, riskRef, transactionDate, grossPremium, brokerage, commission, currency.
      </Text>

      {Platform.OS === 'web' ? (
        <View style={{ marginTop: spacing.lg }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ color: colors.textPrimary }}
            onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </View>
      ) : (
        <Text style={styles.hint}>File upload is available on the web app.</Text>
      )}

      {uploading && <Text style={styles.hint}>Uploading and parsing…</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultSuccess}>{result.successCount} premium records imported.</Text>
          {result.errors.length > 0 && (
            <Text style={styles.resultErrors}>{result.errors.length} rows had issues (see row-level errors in API response).</Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Button label="Close" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  hint: { ...typography.small, color: colors.textMuted },
  resultBox: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: 10 },
  resultSuccess: { ...typography.bodyMedium, color: colors.success },
  resultErrors: { ...typography.small, color: colors.accentAmber, marginTop: spacing.xs },
});
