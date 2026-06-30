import { UserRole } from '@/types/models';
import { moduleColors, ModuleColorKey } from '@/theme/theme';

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
  | 'audit'
  | 'documents';

export interface RouteDef {
  key: RouteKey;
  label: string;
  icon: string; // emoji/glyph used as a lightweight icon (avoids icon font dependency)
  group: string;
  groupOrder: number;
  colorKey: ModuleColorKey;
  roles: UserRole[] | 'ALL';
}

export const ROUTES: RouteDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '◆', group: 'Overview', groupOrder: 0, colorKey: 'overview', roles: 'ALL' },

  { key: 'audit', label: 'Audit Trail', icon: '⌘', group: '1 · System & Security', groupOrder: 1, colorKey: 'system', roles: ['ADMIN', 'AUDITOR', 'COMPLIANCE'] },
  { key: 'documents', label: 'Document Library', icon: '▧', group: '1 · System & Security', groupOrder: 1, colorKey: 'system', roles: 'ALL' },

  { key: 'contracts', label: 'Treaty & Facultative', icon: '▤', group: '2 · Reinsurance', groupOrder: 2, colorKey: 'reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'ACTUARY', 'AUDITOR', 'VIEWER'] },
  { key: 'parties', label: 'Counterparties', icon: '◎', group: '2 · Reinsurance', groupOrder: 2, colorKey: 'reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'COMPLIANCE', 'AUDITOR', 'VIEWER'] },
  { key: 'risks', label: 'Risks & Underwriting', icon: '▲', group: '2 · Reinsurance', groupOrder: 2, colorKey: 'reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'ACTUARY', 'AUDITOR', 'VIEWER'] },
  { key: 'claims', label: 'Claims & Recoveries', icon: '✦', group: '2 · Reinsurance', groupOrder: 2, colorKey: 'reinsurance', roles: ['ADMIN', 'CLAIMS', 'ACCOUNTS', 'ACTUARY', 'AUDITOR', 'VIEWER'] },
  { key: 'premiums', label: 'Premiums & Bordereaux', icon: '▥', group: '2 · Reinsurance', groupOrder: 2, colorKey: 'reinsurance', roles: ['ADMIN', 'UNDERWRITER', 'ACCOUNTS', 'AUDITOR', 'VIEWER'] },

  { key: 'accounting', label: 'Technical Accounting', icon: '$', group: '3 · Accounting', groupOrder: 3, colorKey: 'accounting', roles: ['ADMIN', 'ACCOUNTS', 'AUDITOR', 'VIEWER'] },

  { key: 'investments', label: 'Investment Portfolio', icon: '◈', group: '4 · Investment', groupOrder: 4, colorKey: 'investment', roles: ['ADMIN', 'INVESTMENT_MANAGER', 'AUDITOR', 'VIEWER'] },

  { key: 'gl', label: 'General Ledger', icon: '▦', group: '6 · General Accounting', groupOrder: 6, colorKey: 'generalAccounting', roles: ['ADMIN', 'ACCOUNTS', 'AUDITOR', 'VIEWER'] },

  { key: 'compliance', label: 'Compliance & KYC', icon: '✓', group: '7 · Compliance', groupOrder: 7, colorKey: 'compliance', roles: ['ADMIN', 'COMPLIANCE', 'AUDITOR', 'ACTUARY', 'VIEWER'] },

  { key: 'reporting', label: 'Reports & Analytics', icon: '▣', group: '8 · Reporting', groupOrder: 8, colorKey: 'reporting', roles: 'ALL' },

  { key: 'lifecycle', label: 'Product Lifecycle', icon: '↻', group: '9 · Lifecycle', groupOrder: 9, colorKey: 'lifecycle', roles: ['ADMIN', 'UNDERWRITER', 'AUDITOR', 'VIEWER'] },
];

export function getVisibleRoutes(role: UserRole): RouteDef[] {
  return ROUTES.filter((r) => r.roles === 'ALL' || r.roles.includes(role)).sort((a, b) => a.groupOrder - b.groupOrder);
}
