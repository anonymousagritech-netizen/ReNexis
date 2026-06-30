import { api } from './client';

export async function listNotifications(unreadOnly = false) {
  const { data } = await api.get('/notifications', { params: { unreadOnly, pageSize: 30 } });
  return data as { notifications: any[]; total: number; unreadCount: number };
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.notification;
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all');
}
