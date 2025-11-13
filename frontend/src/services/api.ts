/**
 * Axios instance and interceptors for API requests
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { API_URL, TOKEN_STORAGE_KEY } from '@/utils/constants'
import { authStore } from '@/store/authStore'

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = getStoredTokens()
    
    if (tokens?.access && config.headers) {
      config.headers.Authorization = `Bearer ${tokens.access}`
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }
    
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const tokens = getStoredTokens()
        if (tokens?.refresh) {
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          })
          
          const newTokens = response.data
          storeTokens(newTokens)
          authStore.getState().setTokens(newTokens)
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.access}`
          }
          
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        authStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`[API Error] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, error.response?.data || error.message)
    }
    
    return Promise.reject(error)
  }
)

/**
 * Get stored tokens from localStorage
 */
function getStoredTokens(): { access: string; refresh: string } | null {
  try {
    const tokens = localStorage.getItem(TOKEN_STORAGE_KEY)
    return tokens ? JSON.parse(tokens) : null
  } catch {
    return null
  }
}

/**
 * Store tokens in localStorage
 */
function storeTokens(tokens: { access: string; refresh: string }): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

export default api

