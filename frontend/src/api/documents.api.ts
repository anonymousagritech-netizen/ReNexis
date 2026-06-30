import { api } from './client';
import { API_BASE_URL } from './config';

export async function listDocuments(params?: Record<string, any>) {
  const { data } = await api.get('/documents', { params });
  return data as { documents: any[]; total: number };
}

export async function uploadDocument(file: File, meta: { title?: string; category?: string; contractId?: string; claimId?: string }) {
  const formData = new FormData();
  formData.append('file', file, file.name);
  if (meta.title) formData.append('title', meta.title);
  if (meta.category) formData.append('category', meta.category);
  if (meta.contractId) formData.append('contractId', meta.contractId);
  if (meta.claimId) formData.append('claimId', meta.claimId);
  const { data } = await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.document;
}

export function getDocumentDownloadUrl(id: string) {
  return `${API_BASE_URL}/documents/${id}/download`;
}

export async function deleteDocument(id: string) {
  await api.delete(`/documents/${id}`);
}
