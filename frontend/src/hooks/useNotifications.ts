import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@/services/notificationService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const response = await notificationService.listNotifications()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch notifications')
    },
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      const response = await notificationService.getUnreadCount()
      if (response.status === 'success' && response.data) {
        return response.data.count
      }
      throw new Error(response.message || 'Failed to fetch unread count')
    },
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark notification as read')
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })
      toast.success('All notifications marked as read')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark all notifications as read')
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })
      toast.success('Notification deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete notification')
    },
  })
}

