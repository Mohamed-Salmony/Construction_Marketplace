import { api } from '@/lib/api';
import { getToken } from './auth';

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
  // Short-circuit if not authenticated to avoid spamming 401s on public pages
  if (!getToken()) {
    return { ok: true, status: 200, data: { success: true, data: [] } as any };
  }
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
