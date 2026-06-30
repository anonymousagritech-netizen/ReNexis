import { api } from './client';
import { PremiumTransaction } from '@/types/models';

export async function listPremiums(params?: Record<string, any>) {
  const { data } = await api.get('/premiums', { params });
  return data as { premiums: PremiumTransaction[]; total: number; page: number; pageSize: number };
}

export async function createPremium(payload: Record<string, any>) {
  const { data } = await api.post('/premiums', payload);
  return data.premium as PremiumTransaction;
}

export async function uploadBordereaux(file: File | Blob, fileName: string) {
  const formData = new FormData();
  formData.append('file', file, fileName);
  const { data } = await api.post('/premiums/bordereaux/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data as { batch: any; successCount: number; errors: any[] };
}
