/**
 * Authentication hook
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import type { LoginCredentials, RegisterData } from '@/types/auth.types'
import { toast } from 'sonner'

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, login: storeLogin, logout: storeLogout, setUser } = authStore()

  // Get user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await authService.getProfile()
      if (response.status === 'success' && response.data) {
        setUser(response.data)
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch profile')
    },
    enabled: isAuthenticated,
    retry: false,
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await authService.login(credentials)
      if (response.status === 'success' && response.data) {
        const { access, refresh, user: userData } = response.data
        storeLogin({ access, refresh }, userData)
        return userData
      }
      throw new Error(response.message || 'Login failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Login successful')
      navigate('/dashboard')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed')
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await authService.register(data)
      if (response.status === 'success') {
        return response.data
      }
      throw new Error(response.message || 'Registration failed')
    },
    onSuccess: () => {
      toast.success('Registration successful. Please login.')
      navigate('/login')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed')
    },
  })

  // Logout
  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      storeLogout()
      queryClient.clear()
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }, [navigate, queryClient, storeLogout])

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<typeof user>) => {
      if (!user) throw new Error('User not authenticated')
      const response = await authService.updateProfile(data)
      if (response.status === 'success' && response.data) {
        setUser(response.data)
        return response.data
      }
      throw new Error(response.message || 'Failed to update profile')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Profile updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile')
    },
  })

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await authService.passwordReset(email)
      if (response.status === 'success') {
        return true
      }
      throw new Error(response.message || 'Password reset failed')
    },
    onSuccess: () => {
      toast.success('Password reset email sent')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Password reset failed')
    },
  })

  return {
    user: profile || user,
    isAuthenticated,
    isLoadingProfile,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    passwordReset: passwordResetMutation.mutate,
    isResettingPassword: passwordResetMutation.isPending,
  }
}

