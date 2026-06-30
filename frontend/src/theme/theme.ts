export const moduleColors = {
  overview: { main: '#3E7BFA', soft: 'rgba(62,123,250,0.16)', gradient: ['#3E7BFA', '#6F9CFF'] },
  reinsurance: { main: '#19C2A0', soft: 'rgba(25,194,160,0.16)', gradient: ['#19C2A0', '#4FE0C2'] },
  accounting: { main: '#F2A93B', soft: 'rgba(242,169,59,0.16)', gradient: ['#F2A93B', '#FFCB6B'] },
  investment: { main: '#A66BFF', soft: 'rgba(166,107,255,0.16)', gradient: ['#A66BFF', '#C49BFF'] },
  generalAccounting: { main: '#FF7E54', soft: 'rgba(255,126,84,0.16)', gradient: ['#FF7E54', '#FFA47E'] },
  compliance: { main: '#F25C84', soft: 'rgba(242,92,132,0.16)', gradient: ['#F25C84', '#FF8FAE'] },
  reporting: { main: '#2DD4D4', soft: 'rgba(45,212,212,0.16)', gradient: ['#2DD4D4', '#6FF0F0'] },
  lifecycle: { main: '#E0C341', soft: 'rgba(224,195,65,0.16)', gradient: ['#E0C341', '#F2DC7E'] },
  system: { main: '#9BACCB', soft: 'rgba(155,172,203,0.16)', gradient: ['#9BACCB', '#C2D0E8'] },
};

export type ModuleColorKey = keyof typeof moduleColors;

export const colors = {
  bg: '#0B1220',
  bgElevated: '#121B2E',
  surface: '#17223A',
  surfaceAlt: '#1E2C49',
  border: '#283656',
  borderLight: '#34456B',

  textPrimary: '#EAF0FB',
  textSecondary: '#9BACCB',
  textMuted: '#6B7CA0',

  primary: '#3E7BFA',
  primaryDark: '#2C5FD6',
  primarySoft: 'rgba(62,123,250,0.15)',

  accentTeal: '#19C2A0',
  accentTealSoft: 'rgba(25,194,160,0.15)',

  accentAmber: '#F2A93B',
  accentAmberSoft: 'rgba(242,169,59,0.15)',

  danger: '#F25C54',
  dangerSoft: 'rgba(242,92,84,0.15)',

  success: '#19C2A0',
  successSoft: 'rgba(25,194,160,0.15)',

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
