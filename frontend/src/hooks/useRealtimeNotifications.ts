import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { socketService } from '@/services/socketService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

export function useRealtimeNotifications() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Connect to WebSocket
    socketService.connect()

    // Subscribe to messages
    const unsubscribe = socketService.subscribe((data) => {
      console.log('Received realtime notification:', data)
      
      // 1. Invalidate queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })

      // 2. Show toast
      // Assuming data structure from backend serializer: { title, message, type, ... }
      if (data && data.title) {
        toast(data.title, {
          description: data.message,
          // Optional: add action button or icon based on type
        })
      }
    })

    // Cleanup on unmount or logout
    return () => {
      unsubscribe()
      socketService.disconnect()
    }
  }, [isAuthenticated, queryClient])
}
