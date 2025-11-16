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
        // If registration includes login (auto-login), login the user
        if ('access' in response.data && 'refresh' in response.data && 'user' in response.data) {
          const { access, refresh, user: userData } = response.data as any
          storeLogin({ access, refresh }, userData)
          return { registrationData: response.data, user: userData }
        }
        // If backend doesn't auto-login, try to login with same credentials
        try {
          const loginResponse = await authService.login({
            email: data.email,
            password: data.password,
          })
          if (loginResponse.status === 'success' && loginResponse.data) {
            const { access, refresh, user: userData } = loginResponse.data
            storeLogin({ access, refresh }, userData)
            return { registrationData: response.data, user: userData }
          }
        } catch (loginError) {
          // If auto-login fails, just return registration data
          console.warn('Auto-login after registration failed:', loginError)
        }
        return response.data
      }
      throw new Error(response.message || 'Registration failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Registration successful!')
      
      // Check if a plan was selected before registration
      const storedPlan = localStorage.getItem('selectedPlan')
      console.log('[useAuth] Registration successful, stored plan:', storedPlan)
      
      if (storedPlan && (storedPlan === 'premium' || storedPlan === 'pro')) {
        const checkoutUrl = `/dashboard?checkout=true&plan=${storedPlan}`
        console.log('[useAuth] Navigating to:', checkoutUrl)
        localStorage.removeItem('selectedPlan')
        navigate(checkoutUrl, { replace: true })
      } else {
        console.log('[useAuth] No plan selected, navigating to dashboard')
        localStorage.removeItem('selectedPlan')
        navigate('/dashboard', { replace: true })
      }
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

