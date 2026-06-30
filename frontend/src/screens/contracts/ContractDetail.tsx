import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { getContract, updateContractStatus, renewContract } from '@/api/contracts.api';
import { Contract, ContractStatus } from '@/types/models';
import { formatCurrency, formatDate, titleCase } from '@/utils/format';
import { getApiErrorMessage } from '@/api/client';

const STATUS_FLOW: ContractStatus[] = ['DESIGN', 'QUOTED', 'BOUND', 'IN_FORCE', 'RENEWAL_DUE', 'RUN_OFF', 'CLOSED'];

export function ContractDetail({ contractId, onBack, onChanged }: { contractId: string; onBack: () => void; onChanged: () => void }) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getContract(contractId);
      setContract(c);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const advanceStatus = async (status: ContractStatus) => {
    setError(null);
    setActionLoading(true);
    try {
      await updateContractStatus(contractId, status);
      await fetchData();
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!contract) return;
    setActionLoading(true);
    setError(null);
    try {
      const newExpiry = new Date(contract.expiryDate);
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      await renewContract(contractId, { expiryDate: newExpiry.toISOString().slice(0, 10) });
      await fetchData();
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !contract) {
    return (
      <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(contract.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <View>
      <Pressable onPress={onBack} style={{ marginBottom: spacing.md }}>
        <Text style={styles.backLink}>← Back to contracts</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{contract.name}</Text>
          <Text style={styles.subtitle}>{contract.contractNumber} · {contract.direction} · {titleCase(contract.treatyType)}</Text>
        </View>
        <Badge label={contract.status} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        {nextStatus && (
          <Button label={`Advance to ${titleCase(nextStatus)}`} onPress={() => advanceStatus(nextStatus)} loading={actionLoading} small />
        )}
        {contract.status === 'RENEWAL_DUE' && (
          <Button label="Renew Contract" variant="secondary" onPress={handleRenew} loading={actionLoading} small />
        )}
        {!['CLOSED', 'CANCELLED'].includes(contract.status) && (
          <Button label="Cancel Contract" variant="danger" onPress={() => advanceStatus('CANCELLED')} loading={actionLoading} small />
        )}
      </View>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.cardLabel}>Structure</Text>
          <DetailRow label="Retention" value={contract.retention ? formatCurrency(contract.retention, contract.currency) : '-'} />
          <DetailRow label="Limit" value={contract.limit ? formatCurrency(contract.limit, contract.currency) : '-'} />
          <DetailRow label="Reinstatements" value={String(contract.reinstatements)} />
          <DetailRow label="Total Capacity" value={contract.totalCapacity ? formatCurrency(contract.totalCapacity, contract.currency) : '-'} />
          <DetailRow label="Capacity Used" value={formatCurrency(contract.capacityUsed, contract.currency)} />
        </Card>

        <Card style={styles.gridCard}>
          <Text style={styles.cardLabel}>Commercial Terms</Text>
          <DetailRow label="Brokerage" value={contract.brokeragePct ? `${contract.brokeragePct}%` : '-'} />
          <DetailRow label="Commission Type" value={contract.commissionType ? titleCase(contract.commissionType) : '-'} />
          <DetailRow label="Flat Commission" value={contract.commissionFlatPct ? `${contract.commissionFlatPct}%` : '-'} />
          <DetailRow label="Profit Commission" value={contract.profitCommissionPct ? `${contract.profitCommissionPct}%` : '-'} />
        </Card>

        <Card style={styles.gridCard}>
          <Text style={styles.cardLabel}>Term</Text>
          <DetailRow label="Inception" value={formatDate(contract.inceptionDate)} />
          <DetailRow label="Expiry" value={formatDate(contract.expiryDate)} />
          <DetailRow label="Currency" value={contract.currency} />
        </Card>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <Text style={styles.cardLabel}>Counterparties</Text>
        {contract.parties.map((cp) => (
          <View key={cp.id} style={styles.partyRow}>
            <Text style={styles.partyName}>{cp.party.name}</Text>
            <View style={styles.partyRoleBadge}>
              <Text style={styles.partyRoleText}>{cp.role}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Card style={{ marginTop: spacing.lg }}>
        <DocumentsPanel contractId={contract.id} />
      </Card>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { ...typography.small, color: colors.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  error: { ...typography.small, color: colors.danger, marginBottom: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  gridCard: { flex: 1, minWidth: 260 },
  cardLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border },
  detailLabel: { ...typography.small, color: colors.textSecondary },
  detailValue: { ...typography.bodyMedium, color: colors.textPrimary },
  partyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  partyName: { ...typography.body, color: colors.textPrimary },
  partyRoleBadge: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  partyRoleText: { ...typography.caption, color: colors.textSecondary },
});
