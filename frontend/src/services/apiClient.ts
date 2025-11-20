import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'
import type { ApiResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

type TokenPair = { access: string; refresh: string }

let refreshPromise: Promise<TokenPair | null> | null = null

const refreshAccessToken = async (): Promise<TokenPair | null> => {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) {
    return null
  }

  try {
    const response = await axios.post<ApiResponse<TokenPair>>(
      `${API_BASE_URL}/auth/token/refresh/`,
      { refresh: refreshToken }
    )

    if (response.data.status === 'success' && response.data.data) {
      const tokens = response.data.data
      useAuthStore.getState().setTokens(tokens.access, tokens.refresh)
      return tokens
    }

    return null
  } catch {
    return null
  }
}

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
    
    if (!originalRequest) {
      return Promise.reject(error)
    }

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const tokens = await refreshPromise

      if (tokens && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${tokens.access}`
        return apiClient(originalRequest)
      }

      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle other errors
    return Promise.reject(error)
  }
)

export default apiClient

