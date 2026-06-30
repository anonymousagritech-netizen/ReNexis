import { api } from './client';
import { DashboardOverview, AuditLog } from '@/types/models';

export async function getDashboardOverview() {
  const { data } = await api.get('/dashboard/overview');
  return data as DashboardOverview;
}

export async function getTreatyPerformance(entityId?: string) {
  const { data } = await api.get('/reporting/treaty-performance', { params: { entityId } });
  return data.performance;
}

export async function getClaimsAging() {
  const { data } = await api.get('/reporting/claims-aging');
  return data.aging;
}

export async function getCombinedRatio(periodStart: string, periodEnd: string) {
  const { data } = await api.get('/reporting/combined-ratio', { params: { periodStart, periodEnd } });
  return data;
}

export async function getTopCounterparties(limit = 10) {
  const { data } = await api.get('/reporting/top-counterparties', { params: { limit } });
  return data.topCounterparties;
}

export async function getExposureHeatmap() {
  const { data } = await api.get('/reporting/exposure-heatmap');
  return data.points;
}

export async function getRetroNetPosition(entityId?: string) {
  const { data } = await api.get('/reporting/retro-net-position', { params: { entityId } });
  return data as { grossAssumedIncurred: number; retroRecovered: number; netRetainedPosition: number; inwardContractCount: number; retroContractCount: number };
}

export async function getLifecycleBoard(entityId?: string) {
  const { data } = await api.get('/lifecycle/board', { params: { entityId } });
  return data as { board: Record<string, any[]>; stages: string[] };
}

export async function getRenewalsDue(withinDays = 60) {
  const { data } = await api.get('/lifecycle/renewals-due', { params: { withinDays } });
  return data.contracts;
}

export async function getRunOffWatch() {
  const { data } = await api.get('/lifecycle/run-off-watch');
  return data.runOffContracts;
}

export async function listAuditLogs(params?: Record<string, any>) {
  const { data } = await api.get('/audit', { params });
  return data as { logs: AuditLog[]; total: number; page: number; pageSize: number };
}
