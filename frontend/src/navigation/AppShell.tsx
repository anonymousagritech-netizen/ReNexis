import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '@/theme/theme';
import { Sidebar } from './Sidebar';
import { useAppNavigation } from './NavigationContext';
import { NotificationsBell } from '@/components/NotificationsBell';

import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { ContractsScreen } from '@/screens/contracts/ContractsScreen';
import { PartiesScreen } from '@/screens/parties/PartiesScreen';
import { RisksScreen } from '@/screens/risks/RisksScreen';
import { ClaimsScreen } from '@/screens/claims/ClaimsScreen';
import { PremiumsScreen } from '@/screens/premiums/PremiumsScreen';
import { AccountingScreen } from '@/screens/accounting/AccountingScreen';
import { InvestmentsScreen } from '@/screens/investments/InvestmentsScreen';
import { GLScreen } from '@/screens/gl/GLScreen';
import { ComplianceScreen } from '@/screens/compliance/ComplianceScreen';
import { ReportingScreen } from '@/screens/reporting/ReportingScreen';
import { LifecycleScreen } from '@/screens/lifecycle/LifecycleScreen';
import { AuditScreen } from '@/screens/audit/AuditScreen';
import { DocumentLibraryScreen } from '@/screens/documents/DocumentLibraryScreen';

export function AppShell() {
  const { current } = useAppNavigation();

  return (
    <View style={styles.root}>
      <Sidebar />
      <View style={styles.mainCol}>
        <View style={styles.topBar}>
          <NotificationsBell />
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {renderScreen(current.route, current.params)}
        </ScrollView>
      </View>
    </View>
  );
}

function renderScreen(route: string, params?: Record<string, any>) {
  switch (route) {
    case 'dashboard':
      return <DashboardScreen />;
    case 'contracts':
      return <ContractsScreen params={params} />;
    case 'parties':
      return <PartiesScreen />;
    case 'risks':
      return <RisksScreen />;
    case 'claims':
      return <ClaimsScreen params={params} />;
    case 'premiums':
      return <PremiumsScreen />;
    case 'accounting':
      return <AccountingScreen />;
    case 'investments':
      return <InvestmentsScreen />;
    case 'gl':
      return <GLScreen />;
    case 'compliance':
      return <ComplianceScreen />;
    case 'reporting':
      return <ReportingScreen />;
    case 'lifecycle':
      return <LifecycleScreen />;
    case 'audit':
      return <AuditScreen />;
    case 'documents':
      return <DocumentLibraryScreen />;
    default:
      return <DashboardScreen />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
    height: '100%',
  },
  mainCol: {
    flex: 1,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    width: '100%',
  },
});
