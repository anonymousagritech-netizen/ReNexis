import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { colors, spacing, typography } from '@/theme/theme';
import { useAuth } from '@/auth/AuthContext';
import { getDashboardOverview, getRenewalsDue, getClaimsAging } from '@/api/dashboard.api';
import { DashboardOverview } from '@/types/models';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { useAppNavigation } from '@/navigation/NavigationContext';

export function DashboardScreen() {
  const { user } = useAuth();
  const { navigate } = useAppNavigation();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [claimsAging, setClaimsAging] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ov, ren, aging] = await Promise.all([getDashboardOverview(), getRenewalsDue(60), getClaimsAging()]);
        setOverview(ov);
        setRenewals(ren.slice(0, 5));
        setClaimsAging(aging.slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !overview) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View>
      <ScreenHeader title={`Welcome back, ${user?.firstName}`} subtitle="Here's what's happening across the book today." />

      <View style={styles.statGrid}>
        <StatCard label="In-Force Contracts" value={formatNumber(overview.inForceContracts)} subtext={`${overview.totalContracts} total`} accentColor={colors.primary} />
        <StatCard label="Open Claims" value={formatNumber(overview.openClaims)} subtext="RBNS / IBNR / Reserved" accentColor={colors.danger} />
        <StatCard label="Outstanding Reserves" value={formatCurrency(overview.totalReserves)} accentColor={colors.accentAmber} />
        <StatCard label="Investment Portfolio" value={formatCurrency(overview.totalInvestmentValue)} accentColor={colors.accentTeal} />
        <StatCard label="Renewals Due (60d)" value={formatNumber(overview.renewalsDueSoon)} accentColor={colors.accentAmber} />
        <StatCard label="Pending Approvals" value={formatNumber(overview.pendingApprovals)} accentColor={colors.primary} />
      </View>

      <View style={styles.row}>
        <Card style={styles.halfCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Renewals Due Soon</Text>
            <Text style={styles.link} onPress={() => navigate('lifecycle')}>View lifecycle board →</Text>
          </View>
          {renewals.length === 0 ? (
            <Text style={styles.muted}>No renewals due in the next 60 days.</Text>
          ) : (
            renewals.map((c) => (
              <View key={c.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listPrimary}>{c.name}</Text>
                  <Text style={styles.listSecondary}>{c.contractNumber}</Text>
                </View>
                <Text style={styles.listDate}>{formatDate(c.expiryDate)}</Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.halfCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Claims Aging</Text>
            <Text style={styles.link} onPress={() => navigate('claims')}>View all claims →</Text>
          </View>
          {claimsAging.length === 0 ? (
            <Text style={styles.muted}>No open claims requiring attention.</Text>
          ) : (
            claimsAging.map((c) => (
              <View key={c.claimNumber} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listPrimary}>{c.claimNumber}</Text>
                  <Text style={styles.listSecondary}>{c.daysOpen} days open</Text>
                </View>
                <Badge label={c.status} />
              </View>
            ))
          )}
        </Card>
      </View>

      {overview.pendingKyc > 0 && (
        <Card style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠ {overview.pendingKyc} counterpart{overview.pendingKyc === 1 ? 'y' : 'ies'} pending KYC verification</Text>
          <Text style={styles.link} onPress={() => navigate('compliance')}>Review in Compliance →</Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xxl, alignItems: 'center' },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  halfCard: {
    flex: 1,
    minWidth: 360,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  link: {
    ...typography.small,
    color: colors.primary,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listPrimary: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  listSecondary: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  listDate: {
    ...typography.small,
    color: colors.textSecondary,
  },
  alertCard: {
    marginTop: spacing.lg,
    borderColor: colors.accentAmber,
    backgroundColor: colors.accentAmberSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTitle: {
    ...typography.bodyMedium,
    color: colors.accentAmber,
  },
});
