import { api } from './client';
import { createResourceApi } from './resource';
import { Investment } from '@/types/models';

export const investmentsApi = createResourceApi<Investment>('/investments');

export async function getPortfolioSummary() {
  const { data } = await api.get('/investments/portfolio/summary');
  return data as { totalMarketValue: number; allocation: any[] };
}

export async function addInvestmentIncome(id: string, payload: Record<string, any>) {
  const { data } = await api.post(`/investments/${id}/income`, payload);
  return data.income;
}

export async function addValuation(id: string, payload: Record<string, any>) {
  const { data } = await api.post(`/investments/${id}/valuation`, payload);
  return data.valuation;
}

export async function getDurationGap(liabilityDurationYears: number) {
  const { data } = await api.get('/investments/alm/duration-gap', { params: { liabilityDurationYears } });
  return data as { weightedAssetDuration: number; liabilityDuration: number; durationGap: number };
}
