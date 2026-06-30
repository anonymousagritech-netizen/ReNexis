export const moduleColors = {
  overview: { main: '#3E7BFA', soft: 'rgba(62,123,250,0.12)', gradient: ['#3E7BFA', '#6F9CFF'] },
  reinsurance: { main: '#0FA081', soft: 'rgba(15,160,129,0.12)', gradient: ['#0FA081', '#4FE0C2'] },
  accounting: { main: '#C8841C', soft: 'rgba(200,132,28,0.12)', gradient: ['#C8841C', '#FFCB6B'] },
  investment: { main: '#8B5CF6', soft: 'rgba(139,92,246,0.12)', gradient: ['#8B5CF6', '#C49BFF'] },
  generalAccounting: { main: '#DD5A30', soft: 'rgba(221,90,48,0.12)', gradient: ['#DD5A30', '#FFA47E'] },
  compliance: { main: '#D63A6B', soft: 'rgba(214,58,107,0.12)', gradient: ['#D63A6B', '#FF8FAE'] },
  reporting: { main: '#0E96A3', soft: 'rgba(14,150,163,0.12)', gradient: ['#0E96A3', '#6FF0F0'] },
  lifecycle: { main: '#B38312', soft: 'rgba(179,131,18,0.12)', gradient: ['#B38312', '#F2DC7E'] },
  system: { main: '#64748B', soft: 'rgba(100,116,139,0.12)', gradient: ['#64748B', '#C2D0E8'] },
};

export type ModuleColorKey = keyof typeof moduleColors;

export const colors = {
  bg: '#EEF1F8',
  bgElevated: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4FA',
  border: '#E2E8F4',
  borderLight: '#D7DEF0',

  textPrimary: '#101828',
  textSecondary: '#475467',
  textMuted: '#8A93A6',

  primary: '#3E7BFA',
  primaryDark: '#2C5FD6',
  primarySoft: 'rgba(62,123,250,0.12)',

  accentTeal: '#0FA081',
  accentTealSoft: 'rgba(15,160,129,0.12)',

  accentAmber: '#D98D1F',
  accentAmberSoft: 'rgba(217,141,31,0.12)',

  danger: '#E0413A',
  dangerSoft: 'rgba(224,65,58,0.12)',

  success: '#0FA081',
  successSoft: 'rgba(15,160,129,0.12)',

  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '500' as const },
  caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.4 },
};

export const statusColors: Record<string, { bg: string; fg: string }> = {
  // Contract / lifecycle statuses
  DESIGN: { bg: 'rgba(155,172,203,0.15)', fg: colors.textSecondary },
  QUOTED: { bg: colors.accentAmberSoft, fg: colors.accentAmber },
  BOUND: { bg: colors.primarySoft, fg: colors.primary },
  IN_FORCE: { bg: colors.successSoft, fg: colors.success },
  RENEWAL_DUE: { bg: colors.accentAmberSoft, fg: colors.accentAmber },
  ENDORSED: { bg: colors.primarySoft, fg: colors.primary },
  RUN_OFF: { bg: 'rgba(155,172,203,0.15)', fg: colors.textSecondary },
  CLOSED: { bg: 'rgba(107,124,160,0.15)', fg: colors.textMuted },
  CANCELLED: { bg: colors.dangerSoft, fg: colors.danger },
  // Claims
  NOTIFIED: { bg: colors.accentAmberSoft, fg: colors.accentAmber },
  RBNS: { bg: colors.dangerSoft, fg: colors.danger },
  IBNR: { bg: colors.dangerSoft, fg: colors.danger },
  RESERVED: { bg: colors.accentAmberSoft, fg: colors.accentAmber },
  PARTIALLY_PAID: { bg: colors.primarySoft, fg: colors.primary },
  SETTLED: { bg: colors.successSoft, fg: colors.success },
  REOPENED: { bg: colors.dangerSoft, fg: colors.danger },
  REJECTED: { bg: 'rgba(107,124,160,0.15)', fg: colors.textMuted },
  // Generic
  PENDING: { bg: colors.accentAmberSoft, fg: colors.accentAmber },
  VERIFIED: { bg: colors.successSoft, fg: colors.success },
  PASS: { bg: colors.successSoft, fg: colors.success },
  FAIL: { bg: colors.dangerSoft, fg: colors.danger },
  FLAGGED: { bg: colors.dangerSoft, fg: colors.danger },
  DRAFT: { bg: 'rgba(155,172,203,0.15)', fg: colors.textSecondary },
  ISSUED: { bg: colors.primarySoft, fg: colors.primary },
};

export function getStatusColor(status: string) {
  return statusColors[status] || { bg: 'rgba(155,172,203,0.15)', fg: colors.textSecondary };
}
