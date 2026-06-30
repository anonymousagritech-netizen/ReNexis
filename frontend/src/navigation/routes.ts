import { UserRole } from '@/types/models';

export type RouteKey =
  | 'dashboard'
  | 'contracts'
  | 'parties'
  | 'risks'
  | 'claims'
  | 'premiums'
  | 'accounting'
  | 'investments'
  | 'gl'
  | 'compliance'
  | 'reporting'
  | 'lifecycle'
  | 'audit';

export interface RouteDef {
  key: RouteKey;
  label: string;
  icon: string; // emoji/glyph used as a lightweight icon (avoids icon font dependency)
  group: string;
  roles: UserRole[] | 'ALL';
}

export const ROUTES: RouteDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '◆', group: 'Overview', roles: 'ALL' },

  { key: 'contracts', label: 'Treaty & Facultative', icon: '▤', group: '2 · Reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'ACTUARY', 'AUDITOR', 'VIEWER'] },
  { key: 'parties', label: 'Counterparties', icon: '◎', group: '2 · Reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'COMPLIANCE', 'AUDITOR', 'VIEWER'] },
  { key: 'risks', label: 'Risks & Underwriting', icon: '▲', group: '2 · Reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'ACTUARY', 'AUDITOR', 'VIEWER'] },
  { key: 'claims', label: 'Claims & Recoveries', icon: '✦', group: '2 · Reinsurance', roles: ['ADMIN', 'CLAIMS', 'ACCOUNTS', 'ACTUARY', 'AUDITOR', 'VIEWER'] },
  { key: 'premiums', label: 'Premiums & Bordereaux', icon: '▥', group: '2 · Reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'ACCOUNTS', 'AUDITOR', 'VIEWER'] },

  { key: 'accounting', label: 'Technical Accounting', icon: '$', group: '3 · Accounting', roles: ['ADMIN', 'ACCOUNTS', 'AUDITOR', 'VIEWER'] },
  { key: 'gl', label: 'General Ledger', icon: '▦', group: '6 · General Accounting', roles: ['ADMIN', 'ACCOUNTS', 'AUDITOR', 'VIEWER'] },
  { key: 'investments', label: 'Investment Portfolio', icon: '◈', group: '4 · Investment', roles: ['ADMIN', 'INVESTMENT_MANAGER', 'AUDITOR', 'VIEWER'] },

  { key: 'compliance', label: 'Compliance & KYC', icon: '✓', group: '7 · Compliance', roles: ['ADMIN', 'COMPLIANCE', 'AUDITOR', 'ACTUARY', 'VIEWER'] },
  { key: 'reporting', label: 'Reports & Analytics', icon: '▣', group: '8 · Reporting', roles: 'ALL' },
  { key: 'lifecycle', label: 'Product Lifecycle', icon: '↻', group: '9 · Lifecycle', roles: ['ADMIN', 'UNDERWRITER', 'AUDITOR', 'VIEWER'] },
  { key: 'audit', label: 'Audit Trail', icon: '⌘', group: '1 · System', roles: ['ADMIN', 'AUDITOR', 'COMPLIANCE'] },
];

export function getVisibleRoutes(role: UserRole): RouteDef[] {
  return ROUTES.filter((r) => r.roles === 'ALL' || r.roles.includes(role));
}
