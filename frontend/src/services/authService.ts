/**
 * Authentication service
 */
import api from './api'
import type { ApiResponse } from '@/types/api.types'
import type {
  LoginCredentials,
  RegisterData,
  LoginResponse,
  User,
  AuthTokens,
} from '@/types/auth.types'

export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<ApiResponse<{ id: string; email: string; username: string }>> {
    const response = await api.post<ApiResponse<{ id: string; email: string; username: string }>>(
      '/auth/register/',
      data
    )
    return response.data
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login/', credentials)
    return response.data
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout/')
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error)
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/token/refresh/', {
      refresh: refreshToken,
    })
    return response.data
  },

  /**
   * Get user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/profile/')
    return response.data
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.patch<ApiResponse<User>>('/auth/profile/', data)
    return response.data
  },

  /**
   * Request password reset
   */
  async passwordReset(email: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/auth/password-reset/', { email })
    return response.data
  },

  /**
   * Confirm password reset
   */
  async passwordResetConfirm(token: string, password: string, passwordConfirm: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/auth/password-reset/confirm/', {
      token,
      password,
      password_confirm: passwordConfirm,
    })
    return response.data
  },
}

