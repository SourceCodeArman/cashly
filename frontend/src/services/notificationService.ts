/**
 * Notification service for API calls
 */
import api from './api'
import type {
  Notification,
  NotificationFilters,
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse,
  MarkAllReadResponse,
} from '@/types/notification.types'
import type { ApiResponse } from '@/types/api.types'

/**
 * Get notifications with optional filters
 */
export async function getNotifications(
  filters?: NotificationFilters
): Promise<NotificationListResponse> {
  const params = new URLSearchParams()
  
  if (filters?.is_read !== undefined) {
    params.append('is_read', filters.is_read.toString())
  }
  
  if (filters?.type) {
    params.append('type', filters.type)
  }
  
  if (filters?.page) {
    params.append('page', filters.page.toString())
  }
  
  if (filters?.page_size) {
    params.append('page_size', filters.page_size.toString())
  }
  
  const queryString = params.toString()
  const url = `/notifications/${queryString ? `?${queryString}` : ''}`
  
  const response = await api.get<NotificationListResponse>(url)
  return response.data
}

/**
 * Get a single notification by ID
 */
export async function getNotification(id: string): Promise<ApiResponse<Notification>> {
  const response = await api.get<ApiResponse<Notification>>(`/notifications/${id}/`)
  return response.data
}

/**
 * Mark a notification as read
 */
export async function markAsRead(id: string): Promise<MarkReadResponse> {
  const response = await api.patch<MarkReadResponse>(`/notifications/${id}/mark_read/`)
  return response.data
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<MarkAllReadResponse> {
  const response = await api.post<MarkAllReadResponse>('/notifications/mark_all_read/')
  return response.data
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<ApiResponse<null>> {
  const response = await api.delete<ApiResponse<null>>(`/notifications/${id}/`)
  return response.data
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await api.get<UnreadCountResponse>('/notifications/unread_count/')
  return response.data
}

