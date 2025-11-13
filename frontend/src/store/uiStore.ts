/**
 * UI store using Zustand
 */
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    timestamp: number
  }>
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  addNotification: (message: string, type: UIState['notifications'][0]['type']) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const uiStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  notifications: [],
  
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },
  
  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open })
  },
  
  setTheme: (theme: 'light' | 'dark') => {
    set({ theme })
    document.documentElement.classList.toggle('dark', theme === 'dark')
  },
  
  addNotification: (message: string, type: UIState['notifications'][0]['type']) => {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now(),
    }
    
    set((state) => ({
      notifications: [...state.notifications, notification],
    }))
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notification.id),
      }))
    }, 5000)
  },
  
  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },
  
  clearNotifications: () => {
    set({ notifications: [] })
  },
}))

