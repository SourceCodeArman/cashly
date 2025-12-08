import apiClient from './apiClient'
import type { ApiResponse, Notification, PaginatedResponse, NotificationPreferences } from '@/types'

export const notificationService = {
  async listNotifications(): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Notification>>>(
      '/notifications/'
    )
    return response.data
  },

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(
      '/notifications/unread_count/'
    )
    return response.data
  },

  async markAsRead(id: string): Promise<ApiResponse<Notification>> {
    const response = await apiClient.patch<ApiResponse<Notification>>(
      `/notifications/${id}/mark_read/`
    )
    return response.data
  },

  async markAllAsRead(): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/notifications/mark_all_read/')
    return response.data
  },

  async deleteNotification(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/notifications/${id}/`)
    return response.data
  },

  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    const response = await apiClient.get<ApiResponse<NotificationPreferences>>('/notifications/preferences/')
    return response.data
  },

  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> {
    const response = await apiClient.patch<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences/',
      preferences
    )
    return response.data
  },
}

