import { api } from '@/lib/api';

export type NotificationDto = {
  id?: string;
  _id?: string;
  userId: string;
  role?: 'customer' | 'vendor' | 'technician' | 'admin';
  type: string; // e.g., offer.accepted
  title?: string;
  message?: string;
  data?: Record<string, any>;
  read?: boolean;
  createdAt?: string;
};

export async function listMyNotifications(opts: { unread?: boolean } = {}) {
  const qs = opts.unread ? '?unread=true' : '';
  return api.get<{ success: boolean; data: NotificationDto[] }>(`/api/Notifications/mine${qs}`, { auth: true });
}

export async function markNotificationRead(id: string) {
  const nid = encodeURIComponent(String(id));
  return api.patch<{ success: boolean; data: NotificationDto }>(`/api/Notifications/${nid}/read`, {}, { auth: true });
}

export async function markAllNotificationsRead() {
  return api.post<{ success: boolean }>(`/api/Notifications/mark-all-read`, {}, { auth: true });
}
