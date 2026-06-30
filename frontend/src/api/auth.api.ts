import { api } from './client';
import { User } from '@/types/models';

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function getMeRequest() {
  const { data } = await api.get<{ user: User }>('/auth/me');
  return data.user;
}

export async function logoutRequest() {
  await api.post('/auth/logout');
}
