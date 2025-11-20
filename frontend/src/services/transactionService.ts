import apiClient from './apiClient'
import type { ApiResponse, Transaction, PaginatedResponse, TransactionStats } from '@/types'

export interface TransactionFilters {
  page?: number
  page_size?: number
  limit?: number
  search?: string
  category?: string
  account?: string
  start_date?: string
  end_date?: string
}

export const transactionService = {
  async listTransactions(
    params?: TransactionFilters
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Transaction>>>(
      '/transactions/transactions/',
      { params }
    )
    return response.data
  },

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.get<ApiResponse<Transaction>>(
      `/transactions/transactions/${id}/`
    )
    return response.data
  },

  async categorizeTransaction(
    id: string,
    categoryId: string
  ): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.post<ApiResponse<Transaction>>(
      `/transactions/transactions/${id}/categorize/`,
      { category_id: categoryId }
    )
    return response.data
  },

  async getTransactionStats(): Promise<ApiResponse<TransactionStats>> {
    const response = await apiClient.get<ApiResponse<TransactionStats>>(
      '/transactions/transactions/stats/'
    )
    return response.data
  },
}

