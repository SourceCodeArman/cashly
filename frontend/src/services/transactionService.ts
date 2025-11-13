/**
 * Transaction service
 */
import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'
import type { Transaction, TransactionFilters, TransactionStats } from '@/types/transaction.types'

export const transactionService = {
  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(filters?: TransactionFilters): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }
    
    const response = await api.get<ApiResponse<PaginatedResponse<Transaction>> | PaginatedResponse<Transaction>>(
      `/transactions/transactions/?${params.toString()}`
    )
    const data = response.data as unknown
    // If already wrapped
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<PaginatedResponse<Transaction>>
    }
    // DRF paginated default: { count, next, previous, results }
    if (
      typeof data === 'object' &&
      data !== null &&
      'results' in (data as Record<string, unknown>)
    ) {
      return {
        status: 'success',
        data: data as PaginatedResponse<Transaction>,
        message: 'OK',
      }
    }
    return {
      status: 'error',
      data: { count: 0, next: null, previous: null, results: [] },
      message: 'Unexpected transactions response format',
    }
  },

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    const response = await api.get<ApiResponse<Transaction> | Transaction>(
      `/transactions/transactions/${transactionId}/`
    )
    const data = response.data as unknown
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<Transaction>
    }
    // DRF retrieve default: object
    if (typeof data === 'object' && data !== null) {
      return {
        status: 'success',
        data: data as Transaction,
        message: 'OK',
      }
    }
    return {
      status: 'error',
      data: undefined as unknown as Transaction,
      message: 'Unexpected transaction response format',
    }
  },

  /**
   * Categorize transaction
   */
  async categorizeTransaction(transactionId: string, categoryId: string): Promise<ApiResponse<Transaction>> {
    const response = await api.post<ApiResponse<Transaction>>(
      `/transactions/transactions/${transactionId}/categorize/`,
      { category_id: categoryId }
    )
    return response.data
  },

  /**
   * Get transaction statistics
   */
  async getTransactionStats(): Promise<ApiResponse<TransactionStats>> {
    const response = await api.get<ApiResponse<TransactionStats>>(
      '/transactions/transactions/stats/'
    )
    return response.data
  },

  /**
   * Search transactions
   */
  async searchTransactions(query: string, filters?: TransactionFilters): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    return this.getTransactions({ ...filters, search: query })
  },

  /**
   * Sum transactions by category within a date range
   * Expects backend to support query params: category_id, from, to, aggregate=sum
   */
  async getCategorySum(params: { categoryId: string; from?: string; to?: string }): Promise<ApiResponse<{ total: number }>> {
    const search = new URLSearchParams()
    search.append('category_id', params.categoryId)
    if (params.from) search.append('from', params.from)
    if (params.to) search.append('to', params.to)
    search.append('aggregate', 'sum')
    const response = await api.get<ApiResponse<{ total: number }> | { total: number }>(
      `/transactions/transactions/summary/?${search.toString()}`
    )
    const data = response.data as unknown
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<{ total: number }>
    }
    if (typeof data === 'object' && data !== null && 'total' in (data as Record<string, unknown>)) {
      return {
        status: 'success',
        data: data as { total: number },
        message: 'OK',
      }
    }
    return {
      status: 'error',
      data: { total: 0 },
      message: 'Unexpected summary response format',
    }
  },
}

