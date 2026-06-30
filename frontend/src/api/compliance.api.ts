import { api } from './client';
import { ComplianceCheck } from '@/types/models';

export async function listComplianceChecks(params?: Record<string, any>) {
  const { data } = await api.get('/compliance/checks', { params });
  return data as { checks: ComplianceCheck[]; total: number };
}

export async function createComplianceCheck(payload: Record<string, any>) {
  const { data } = await api.post('/compliance/checks', payload);
  return data.check as ComplianceCheck;
}

export async function getComplianceDashboard() {
  const { data } = await api.get('/compliance/dashboard');
  return data as { pendingKyc: number; highRiskParties: any[]; flaggedChecks: ComplianceCheck[] };
}

export async function listRegulatoryReports(params?: Record<string, any>) {
  const { data } = await api.get('/compliance/reports', { params });
  return data.reports;
}

export async function createRegulatoryReport(payload: Record<string, any>) {
  const { data } = await api.post('/compliance/reports', payload);
  return data.report;
}

export async function getScheduleFData(entityId: string, periodStart: string, periodEnd: string) {
  const { data } = await api.get('/compliance/reports/schedule-f/data', { params: { entityId, periodStart, periodEnd } });
  return data.scheduleF;
}

export async function listCSMRecords(contractId?: string) {
  const { data } = await api.get('/compliance/csm', { params: { contractId } });
  return data.csmRecords;
}

export async function createCSMRecord(payload: Record<string, any>) {
  const { data } = await api.post('/compliance/csm', payload);
  return data.csmRecord;
}
