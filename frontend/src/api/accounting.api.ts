import { api } from './client';
import { StatementOfAccount, CurrentAccountEntry } from '@/types/models';

export async function generateSOA(contractId: string, periodStart: string, periodEnd: string) {
  const { data } = await api.post('/accounting/soa/generate', { contractId, periodStart, periodEnd });
  return data as { statementOfAccount: StatementOfAccount; lossRatioPct: number };
}

export async function listSOA(params?: Record<string, any>) {
  const { data } = await api.get('/accounting/soa', { params });
  return data as { statements: StatementOfAccount[]; total: number; page: number; pageSize: number };
}

export async function issueSOA(id: string) {
  const { data } = await api.patch(`/accounting/soa/${id}/issue`);
  return data.statementOfAccount as StatementOfAccount;
}

export async function settleSOA(id: string) {
  const { data } = await api.patch(`/accounting/soa/${id}/settle`);
  return data.statementOfAccount as StatementOfAccount;
}

export async function listCurrentAccount(params?: Record<string, any>) {
  const { data } = await api.get('/accounting/current-account', { params });
  return data as { entries: CurrentAccountEntry[]; total: number; outstanding: number };
}

export async function createCurrentAccountEntry(payload: Record<string, any>) {
  const { data } = await api.post('/accounting/current-account', payload);
  return data.entry as CurrentAccountEntry;
}

export async function reconcileEntry(entryId: string, bankStatementRef: string) {
  const { data } = await api.post('/accounting/current-account/reconcile', { entryId, bankStatementRef });
  return data.entry as CurrentAccountEntry;
}

export async function getAgingReport() {
  const { data } = await api.get('/accounting/current-account/aging');
  return data.aging;
}

export async function listFxRates(baseCurrency?: string) {
  const { data } = await api.get('/accounting/fx-rates', { params: { baseCurrency } });
  return data.rates;
}

export async function createFxRate(payload: Record<string, any>) {
  const { data } = await api.post('/accounting/fx-rates', payload);
  return data.fxRate;
}
