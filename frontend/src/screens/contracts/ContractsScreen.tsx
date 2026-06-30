import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/FormField';
import { colors, spacing, typography, moduleColors } from '@/theme/theme';
import { listContracts } from '@/api/contracts.api';
import { Contract } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { useAppNavigation } from '@/navigation/NavigationContext';
import { ContractCreateModal } from './ContractCreateModal';
import { ContractDetail } from './ContractDetail';

const DIRECTION_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Inward', value: 'INWARD' },
  { label: 'Outward', value: 'OUTWARD' },
];

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Design', value: 'DESIGN' },
  { label: 'Quoted', value: 'QUOTED' },
  { label: 'Bound', value: 'BOUND' },
  { label: 'In Force', value: 'IN_FORCE' },
  { label: 'Renewal Due', value: 'RENEWAL_DUE' },
  { label: 'Run-off', value: 'RUN_OFF' },
  { label: 'Closed', value: 'CLOSED' },
];

export function ContractsScreen({ params }: { params?: Record<string, any> }) {
  const { navigate } = useAppNavigation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(params?.contractId || null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listContracts({ direction: direction || undefined, status: status || undefined, pageSize: 100 });
      setContracts(res.contracts);
    } finally {
      setLoading(false);
    }
  }, [direction, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (selectedId) {
    return <ContractDetail contractId={selectedId} onBack={() => setSelectedId(null)} onChanged={fetchData} />;
  }

  const columns: Column<Contract>[] = [
    { key: 'contractNumber', header: 'Contract #', width: 150, render: (r) => r.contractNumber },
    { key: 'name', header: 'Name', width: 260, render: (r) => r.name },
    { key: 'direction', header: 'Direction', width: 100, render: (r) => r.direction },
    { key: 'treatyType', header: 'Type', width: 200, render: (r) => r.treatyType.replace(/_/g, ' ') },
    { key: 'limit', header: 'Limit', width: 140, render: (r) => (r.limit ? formatCurrency(r.limit, r.currency) : '-') },
    { key: 'capacityUsed', header: 'Capacity Used', width: 140, render: (r) => formatCurrency(r.capacityUsed, r.currency) },
    { key: 'expiryDate', header: 'Expiry', width: 120, render: (r) => formatDate(r.expiryDate) },
    { key: 'status', header: 'Status', width: 130, render: (r) => <Badge label={r.status} /> },
  ];

  return (
    <View>
      <ScreenHeader accentColor={moduleColors.reinsurance.main}         title="Treaty & Facultative Contracts"
        subtitle="Inward and outward reinsurance contract management"
        actions={<Button label="+ New Contract" onPress={() => setCreateOpen(true)} />}
      />

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.filters}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Direction</Text>
            <SelectField value={direction} options={DIRECTION_OPTIONS} onChange={setDirection} />
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status</Text>
            <SelectField value={status} options={STATUS_OPTIONS} onChange={setStatus} />
          </View>
        </View>
      </Card>

      <Card>
        <DataTable columns={columns} data={contracts} loading={loading} onRowPress={(r) => setSelectedId(r.id)} emptyMessage="No contracts yet. Create your first treaty to get started." />
      </Card>

      <ContractCreateModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
  filterGroup: {
    gap: spacing.xs,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
