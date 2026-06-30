import { api } from './client';
import { Contract, ContractStatus } from '@/types/models';

export async function listContracts(params?: Record<string, any>) {
  const { data } = await api.get('/contracts', { params });
  return data as { contracts: Contract[]; total: number; page: number; pageSize: number };
}

export async function getContract(id: string) {
  const { data } = await api.get(`/contracts/${id}`);
  return data.contract as Contract;
}

export async function createContract(payload: Record<string, any>) {
  const { data } = await api.post('/contracts', payload);
  return data.contract as Contract;
}

export async function updateContract(id: string, payload: Record<string, any>) {
  const { data } = await api.put(`/contracts/${id}`, payload);
  return data.contract as Contract;
}

export async function updateContractStatus(id: string, status: ContractStatus, notes?: string) {
  const { data } = await api.patch(`/contracts/${id}/status`, { status, notes });
  return data.contract as Contract;
}

export async function createEndorsement(id: string, payload: { description: string; effectiveDate: string; changes: Record<string, any> }) {
  const { data } = await api.post(`/contracts/${id}/endorsements`, payload);
  return data.endorsement;
}

export async function renewContract(id: string, payload: Record<string, any>) {
  const { data } = await api.post(`/contracts/${id}/renew`, payload);
  return data.contract as Contract;
}

export async function getContractLifecycle(id: string) {
  const { data } = await api.get(`/contracts/${id}/lifecycle`);
  return data.events;
}
