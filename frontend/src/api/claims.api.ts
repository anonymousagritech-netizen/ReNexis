import { api } from './client';
import { Claim, ClaimStatus } from '@/types/models';

export async function listClaims(params?: Record<string, any>) {
  const { data } = await api.get('/claims', { params });
  return data as { claims: Claim[]; total: number; page: number; pageSize: number };
}

export async function getClaim(id: string) {
  const { data } = await api.get(`/claims/${id}`);
  return data.claim;
}

export async function createClaim(payload: Record<string, any>) {
  const { data } = await api.post('/claims', payload);
  return data as { claim: Claim; calculatedRecovery: number };
}

export async function adjustReserve(id: string, newReserveAmount: number, notes?: string, status?: ClaimStatus) {
  const { data } = await api.post(`/claims/${id}/reserve`, { newReserveAmount, notes, status });
  return data.claim as Claim;
}

export async function recordPayment(id: string, amount: number, notes?: string) {
  const { data } = await api.post(`/claims/${id}/payment`, { amount, notes });
  return data.claim as Claim;
}

export async function requestCashCall(id: string, amount: number, notes?: string) {
  const { data } = await api.post(`/claims/${id}/cash-call`, { amount, notes });
  return data.claim as Claim;
}

export async function updateCashCallStatus(id: string, status: 'RECEIVED' | 'DECLINED') {
  const { data } = await api.patch(`/claims/${id}/cash-call/status`, { status });
  return data.claim as Claim;
}

export async function updateClaimStatus(id: string, status: ClaimStatus) {
  const { data } = await api.patch(`/claims/${id}/status`, { status });
  return data.claim as Claim;
}
