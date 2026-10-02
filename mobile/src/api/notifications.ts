import client from './client';
import { PaginationParams } from '../types/api';
import { Notification, NotificationListResponse } from '../types/api';

function normalizeNotification(item: any): Notification {
  return {
    ...item,
    description: item.description ?? item.message ?? '',
    message: item.message ?? item.description ?? '',
  };
}

function normalizeList(response: NotificationListResponse): NotificationListResponse {
  return {
    ...response,
    data: (response.data ?? []).map(normalizeNotification),
  };
}

export const notificationsApi = {
  async getNotifications(pagination?: PaginationParams): Promise<NotificationListResponse> {
    const response = await client.get<NotificationListResponse>('/api/notifications', {
      params: {
        page: pagination?.page,
        pageSize: pagination?.pageSize,
      },
    });
    return normalizeList(response.data);
  },

  // Backend contract: PATCH /api/notifications with { id } or { markAll: true }.
  // DELETE /api/notifications?id=... (see src/app/api/notifications/route.ts).
  async markAsRead(id: string): Promise<void> {
    await client.patch('/api/notifications', { id });
  },

  async markAllAsRead(): Promise<void> {
    await client.patch('/api/notifications', { markAll: true });
  },

  async deleteNotification(id: string): Promise<void> {
    await client.delete('/api/notifications', { params: { id } });
  },
};
