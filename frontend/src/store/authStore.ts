/**
 * Authentication store using Zustand
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, AuthTokens } from '@/types/auth.types'
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '@/utils/constants'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  login: (tokens: AuthTokens, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  setTokens: (tokens: AuthTokens) => void
  updateUser: (updates: Partial<User>) => void
}

export const authStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      
      login: (tokens: AuthTokens, user: User) => {
        // Store tokens in localStorage
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
        
        set({
          tokens,
          user,
          isAuthenticated: true,
        })
      },
      
      logout: () => {
        // Clear tokens and user from localStorage
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        })
      },
      
      setUser: (user: User) => {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
        set({ user })
      },
      
      setTokens: (tokens: AuthTokens) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
        set({ tokens })
      },
      
      updateUser: (updates: Partial<User>) => {
        set((state) => {
          if (!state.user) return state
          
          const updatedUser = { ...state.user, ...updates }
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
          
          return { user: updatedUser }
        })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

