import apiClient from './apiClient'
import type { ApiResponse, User } from '@/types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
}

export interface LoginResponse {
  refresh: string
  access: string
  user: {
    id: number
    email: string
    username: string
    is_superuser?: boolean
  }
}

export const authService = {
  async register(userData: RegisterData): Promise<ApiResponse<{ id: number; email: string; username: string }>> {
    const response = await apiClient.post<ApiResponse<{ id: number; email: string; username: string }>>(
      '/auth/register/',
      userData
    )
    return response.data
  },

  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login/',
      credentials
    )
    return response.data
  },

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/profile/')
    return response.data
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await apiClient.patch<ApiResponse<User>>('/auth/profile/', data)
    return response.data
  },

  async passwordReset(email: string): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/password-reset/', { email })
    return response.data
  },

  async refreshToken(refresh: string): Promise<ApiResponse<{ access: string; refresh: string }>> {
    const response = await apiClient.post<ApiResponse<{ access: string; refresh: string }>>(
      '/auth/token/refresh/',
      { refresh }
    )
    return response.data
  },

  async logout(): Promise<void> {
    // Token is typically invalidated on backend, but we clear local state
    // No API call needed as JWT is stateless
  },
}

