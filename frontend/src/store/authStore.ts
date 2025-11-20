import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authService } from '@/services/authService'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isSuperuser: boolean
  setUser: (user: User | null) => void
  setTokens: (access: string, refresh: string) => void
  logout: () => void
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isSuperuser: false,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isSuperuser: user?.isSuperuser || false
        })
      },

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isSuperuser: false
        })
      },

      initializeAuth: async () => {
        const token = localStorage.getItem('accessToken')
        if (token) {
          try {
            const response = await authService.getProfile()
            if (response.status === 'success' && response.data) {
              const userData = response.data
              set({
                user: userData,
                isAuthenticated: true,
                isSuperuser: userData.isSuperuser || false
              })
              console.log('Auth initialized, isSuperuser:', userData.isSuperuser)
            } else {
              get().logout()
            }
          } catch (error) {
            console.error('Failed to initialize auth:', error)
            get().logout()
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isSuperuser: state.isSuperuser,
      }),
    }
  )
)
