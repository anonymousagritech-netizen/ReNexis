import { api } from './client';

export async function listCatastropheEvents() {
  const { data } = await api.get('/catastrophe-events');
  return data.events as any[];
}

export async function createCatastropheEvent(payload: { name: string; peril: string; eventDate: string; zone?: string; description?: string }) {
  const { data } = await api.post('/catastrophe-events', payload);
  return data.event;
}

export async function getCatastropheEvent(id: string) {
  const { data } = await api.get(`/catastrophe-events/${id}`);
  return data as { event: any; totalGrossIncurred: number; totalRecovery: number };
}
