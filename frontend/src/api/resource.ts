import { api } from './client';

/**
 * Factory for straightforward CRUD resources (parties, risks, investments, GL accounts, etc.)
 * Avoids re-writing identical list/get/create/update boilerplate per module.
 */
export function createResourceApi<T>(basePath: string) {
  return {
    async list(params?: Record<string, any>): Promise<{ items: T[]; total: number; page: number; pageSize: number }> {
      const { data } = await api.get(basePath, { params });
      const key = Object.keys(data).find((k) => Array.isArray(data[k])) || 'items';
      return { items: data[key] || [], total: data.total ?? 0, page: data.page ?? 1, pageSize: data.pageSize ?? 25 };
    },
    async get(id: string): Promise<T> {
      const { data } = await api.get(`${basePath}/${id}`);
      const key = Object.keys(data)[0];
      return data[key];
    },
    async create(payload: Partial<T>): Promise<T> {
      const { data } = await api.post(basePath, payload);
      const key = Object.keys(data)[0];
      return data[key];
    },
    async update(id: string, payload: Partial<T>): Promise<T> {
      const { data } = await api.put(`${basePath}/${id}`, payload);
      const key = Object.keys(data)[0];
      return data[key];
    },
    async remove(id: string): Promise<void> {
      await api.delete(`${basePath}/${id}`);
    },
  };
}
