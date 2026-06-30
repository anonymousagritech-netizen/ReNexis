import { api } from './client';
import { GLAccount } from '@/types/models';

export async function listGLAccounts(entityId?: string) {
  const { data } = await api.get('/gl/accounts', { params: { entityId } });
  return data.accounts as GLAccount[];
}

export async function createGLAccount(payload: Record<string, any>) {
  const { data } = await api.post('/gl/accounts', payload);
  return data.account as GLAccount;
}

export async function postJournal(payload: Record<string, any>) {
  const { data } = await api.post('/gl/journal', payload);
  return data as { journalRef: string; entries: any[] };
}

export async function listJournal(params?: Record<string, any>) {
  const { data } = await api.get('/gl/journal', { params });
  return data as { entries: any[]; total: number };
}

export async function getTrialBalance(entityId: string, asOf?: string) {
  const { data } = await api.get('/gl/trial-balance', { params: { entityId, asOf } });
  return data as { accounts: any[]; totalDebit: number; totalCredit: number; balanced: boolean };
}

export async function getFinancialStatements(entityId: string, periodStart: string, periodEnd: string) {
  const { data } = await api.get('/gl/financial-statements', { params: { entityId, periodStart, periodEnd } });
  return data;
}

export async function listFixedAssets() {
  const { data } = await api.get('/gl/fixed-assets');
  return data.assets;
}

export async function createFixedAsset(payload: Record<string, any>) {
  const { data } = await api.post('/gl/fixed-assets', payload);
  return data.asset;
}

export async function runDepreciation() {
  const { data } = await api.post('/gl/fixed-assets/run-depreciation');
  return data as { updatedAssets: number };
}
