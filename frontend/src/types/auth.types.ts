/**
 * Authentication types
 */
export interface User {
  id: string
  email: string
  username: string
  first_name?: string
  last_name?: string
  phone_number?: string
  subscription_tier: 'free' | 'premium'
  mfa_enabled: boolean
  preferences?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginResponse {
  refresh: string
  access: string
  user: User
}

