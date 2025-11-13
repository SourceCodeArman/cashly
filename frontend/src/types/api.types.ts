/**
 * API response types
 */
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  data: T | null
  message: string
  errors?: Record<string, string[]>
  code?: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

