/**
 * React hooks for notification management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '@/services/notificationService'
import type {
  Notification,
  NotificationFilters,
} from '@/types/notification.types'

/**
 * Get notifications with optional filters
 */
export function useNotifications(filters?: NotificationFilters) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const response = await getNotifications(filters)
      if ('results' in response.data && Array.isArray(response.data.results)) {
        return response.data.results
      }
      return []
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

/**
 * Get unread notifications
 */
export function useUnreadNotifications() {
  return useNotifications({ is_read: false })
}

/**
 * Get unread notification count
 */
export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await getUnreadCount()
      return response.data.count
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

/**
 * Get a single notification by ID
 */
export function useNotification(id: string | null) {
  return useQuery<Notification | null>({
    queryKey: ['notification', id],
    queryFn: async () => {
      if (!id) return null
      const response = await getNotification(id)
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * Mark notification as read mutation
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

/**
 * Mark all notifications as read mutation
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

/**
 * Delete notification mutation
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

