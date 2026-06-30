import { api } from './client';
import { createResourceApi } from './resource';
import { Entity, Party } from '@/types/models';

export const entitiesApi = createResourceApi<Entity>('/entities');
export const partiesApi = createResourceApi<Party>('/parties');

export async function updatePartyKyc(id: string, kycStatus: string, amlRiskRating?: string) {
  const { data } = await api.patch(`/parties/${id}/kyc`, { kycStatus, amlRiskRating });
  return data.party as Party;
}
