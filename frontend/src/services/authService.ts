import apiClient from './apiClient'
import type { ApiResponse, User, PasswordChangeData } from '@/types'

export interface LoginCredentials {
  login: string
  password: string
}

export interface RegisterData {
  email?: string
  phone_number?: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
}

export interface LoginResponse {
  refresh?: string
  access?: string
  user?: {
    id: number
    email?: string
    is_superuser?: boolean
  }
  temp_token?: string
  user_id?: number
}

export const authService = {
  async register(userData: RegisterData): Promise<ApiResponse<{ id: number; email?: string; phone_number?: string }>> {
    const response = await apiClient.post<ApiResponse<{ id: number; email?: string; phone_number?: string }>>(
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

  async googleLogin(token: string): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/google/',
      { access_token: token }
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

  async changePassword(data: PasswordChangeData): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/password-change/', data)
    return response.data
  },

  async logout(): Promise<void> {
    // Token is typically invalidated on backend, but we clear local state
    // No API call needed as JWT is stateless
  },

  async requestEmailChange(data: { new_email: string; password: string }): Promise<ApiResponse<{ token?: string }>> {
    const response = await apiClient.post<ApiResponse<{ token?: string }>>('/auth/email-change/request/', data)
    return response.data
  },

  async verifyEmailChange(token: string): Promise<ApiResponse<{ email: string }>> {
    const response = await apiClient.post<ApiResponse<{ email: string }>>('/auth/email-change/verify/', { token })
    return response.data
  },

  // MFA Methods
  async setupMFA(): Promise<ApiResponse<{ secret: string; otpauth_url: string }>> {
    const response = await apiClient.post<ApiResponse<{ secret: string; otpauth_url: string }>>('/auth/mfa/setup/')
    return response.data
  },

  async verifyMFASetup(code: string, secret: string): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/mfa/verify-setup/', { code, secret })
    return response.data
  },

  async verifyMFALogin(code: string, token: string): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/mfa/verify-login/', { code, token })
    return response.data
  },

  async disableMFA(): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/mfa/disable/')
    return response.data
  },

  async generateBackupCodes(): Promise<ApiResponse<{ backup_codes: string[]; generated_at: string; total_codes: number }>> {
    const response = await apiClient.post<ApiResponse<{ backup_codes: string[]; generated_at: string; total_codes: number }>>(
      '/auth/mfa/backup-codes/generate/'
    )
    return response.data
  },

  async verifyBackupCode(code: string, token: string): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/mfa/backup-codes/verify/', { code, token })
    return response.data
  },
}

