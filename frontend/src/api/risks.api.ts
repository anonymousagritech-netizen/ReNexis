import { api } from './client';
import { Risk } from '@/types/models';

export async function listRisks(params?: Record<string, any>) {
  const { data } = await api.get('/risks', { params });
  return data as { risks: Risk[]; total: number; page: number; pageSize: number };
}

export async function getRisk(id: string) {
  const { data } = await api.get(`/risks/${id}`);
  return data.risk;
}

export async function createRisk(payload: Record<string, any>) {
  const { data } = await api.post('/risks', payload);
  return data as { risk: Risk; requiresSpecialAcceptance: boolean };
}

export async function decideSpecialAcceptance(id: string, decision: 'APPROVED' | 'REJECTED', comments?: string) {
  const { data } = await api.patch(`/risks/${id}/special-acceptance`, { decision, comments });
  return data.risk as Risk;
}

export async function getAccumulationByZone() {
  const { data } = await api.get('/risks/accumulation/by-zone');
  return data.accumulation as { catZone: string; peril: string; _sum: { sumInsured: number; allocatedAmount: number } }[];
}
