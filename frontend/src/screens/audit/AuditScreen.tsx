import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { DataTable, Column } from '@/components/DataTable';
import { Badge } from '@/components/Badge';
import { colors, spacing, typography } from '@/theme/theme';
import { listAuditLogs } from '@/api/dashboard.api';
import { AuditLog } from '@/types/models';

export function AuditScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs({ pageSize: 100 });
      setLogs(res.logs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', header: 'Timestamp', width: 180, render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: 'user', header: 'Actor', width: 200, render: (r) => (r.user ? `${r.user.firstName} ${r.user.lastName} (${r.user.role})` : 'System') },
    { key: 'action', header: 'Action', width: 110, render: (r) => <Badge label={r.action} /> },
    { key: 'entityName', header: 'Entity', width: 200, render: (r) => r.entityName },
    { key: 'ipAddress', header: 'IP Address', width: 140, render: (r) => r.ipAddress || '—' },
  ];

  return (
    <View>
      <ScreenHeader title="Audit Trail" subtitle="Module 1 · Immutable record of every mutation — actor, action, before/after state" />
      <Card>
        <DataTable columns={columns} data={logs} loading={loading} emptyMessage="No audit events recorded yet." />
      </Card>
      <Text style={styles.footnote}>Showing the most recent {logs.length} events. Full history is retrievable via the API for regulator/auditor exports.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footnote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
});
