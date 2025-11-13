/**
 * Account service
 */
import type { AxiosError } from 'axios'

import api from './api'
import type { ApiResponse } from '@/types/api.types'
import type { Account, AccountConnectionData } from '@/types/account.types'
import { getPlaidErrorMessage } from '@/utils/plaidErrors'

interface LinkTokenParams {
  products?: string[]
  webhook?: string
  access_token?: string
  account_filters?: Record<string, string[]>
}

function handlePlaidError(error: AxiosError<ApiResponse<unknown>>): never {
  const plaidError =
    (error.response?.data?.errors && Object.keys(error.response.data.errors)[0]) ||
    (error.response?.data?.data &&
    typeof error.response.data.data === 'object' &&
    error.response.data.data !== null &&
    'error_code' in (error.response.data.data as Record<string, unknown>)
      ? ((error.response.data.data as Record<string, unknown>).error_code as string)
      : undefined)

  const message =
    getPlaidErrorMessage(plaidError) ||
    error.response?.data?.message ||
    error.message ||
    'An unexpected error occurred'

  throw new Error(message)
}

export const accountService = {
  /**
   * Create Plaid link token
   */
  async createLinkToken(params?: LinkTokenParams): Promise<ApiResponse<{ link_token: string }>> {
    try {
    const response = await api.post<ApiResponse<{ link_token: string }>>(
        '/accounts/create-link-token/',
        params ?? {}
    )
    return response.data
    } catch (error) {
      handlePlaidError(error as AxiosError<ApiResponse<unknown>>)
    }
  },

  /**
   * Connect account via Plaid
   */
  async connectAccount(data: AccountConnectionData): Promise<ApiResponse<Account[]>> {
    try {
      const response = await api.post<ApiResponse<{ accounts: Account[] }>>(
        '/accounts/connect/',
        data
      )
      return {
        ...response.data,
        data: response.data.data?.accounts ?? [],
      }
    } catch (error) {
      handlePlaidError(error as AxiosError<ApiResponse<unknown>>)
    }
  },

  /**
   * Get user accounts
   */
  async getAccounts(): Promise<ApiResponse<Account[]>> {
    const response = await api.get('/accounts/')
    const data = response.data as unknown

    // Handle our standard wrapped ApiResponse shape
    if (
      typeof data === 'object' &&
      data !== null &&
      'status' in (data as Record<string, unknown>)
    ) {
      return data as ApiResponse<Account[]>
    }

    // Gracefully handle DRF paginated response: { count, next, previous, results: [...] }
    if (
      typeof data === 'object' &&
      data !== null &&
      'results' in (data as Record<string, unknown>) &&
      Array.isArray((data as { results: unknown }).results)
    ) {
      const results = (data as { results: Account[] }).results
      return {
        status: 'success',
        data: results,
        message: 'OK',
      }
    }

    // Fallback to error shape
    return {
      status: 'error',
      data: [],
      message: 'Unexpected accounts response format',
    }
  },

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<ApiResponse<Account>> {
    const response = await api.get<ApiResponse<Account> | Account>(`/accounts/${accountId}/`)
    const data = response.data as unknown
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<Account>
    }
    if (typeof data === 'object' && data !== null) {
      return {
        status: 'success',
        data: data as Account,
        message: 'OK',
      }
    }
    return {
      status: 'error',
      data: undefined as unknown as Account,
      message: 'Unexpected account response format',
    }
  },

  /**
   * Sync account transactions
   */
  async syncAccount(accountId: string): Promise<ApiResponse<{ account_id: string }>> {
    const response = await api.post<ApiResponse<{ account_id: string }>>(
      `/accounts/${accountId}/sync/`
    )
    return response.data
  },

  /**
   * Delete/disconnect account
   */
  async deleteAccount(accountId: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/accounts/${accountId}/`)
    return response.data
  },

  /**
   * Disconnect Plaid item using explicit endpoint
   */
  async disconnectAccount(accountId: string): Promise<ApiResponse<{ account_id: string }>> {
    try {
      const response = await api.post<ApiResponse<{ account_id: string }>>(
        `/accounts/${accountId}/disconnect/`
      )
      return response.data
    } catch (error) {
      handlePlaidError(error as AxiosError<ApiResponse<unknown>>)
    }
  },

  /**
   * Update account webhook
   */
  async updateAccountWebhook(
    accountId: string,
    webhook: string
  ): Promise<ApiResponse<{ account_id: string; webhook: string }>> {
    try {
      const response = await api.post<ApiResponse<{ account_id: string; webhook: string }>>(
        `/accounts/${accountId}/update-webhook/`,
        { webhook }
      )
      return response.data
    } catch (error) {
      handlePlaidError(error as AxiosError<ApiResponse<unknown>>)
    }
  },

  /**
   * Retrieve Plaid products for an account
   */
  async getAccountProducts(accountId: string): Promise<string[]> {
    const response = await this.getAccount(accountId)
    if (response.status === 'success' && response.data) {
      return response.data.plaid_products ?? []
    }
    return []
  },

  /**
   * Update account (e.g., custom_name)
   */
  async updateAccount(accountId: string, updates: Partial<Pick<Account, 'custom_name'>>): Promise<ApiResponse<Account>> {
    const response = await api.patch<ApiResponse<Account>>(
      `/accounts/${accountId}/`,
      updates
    )
    return response.data
  },
}

