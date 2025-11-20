import apiClient from './apiClient'
import type { ApiResponse, Account, PaginatedResponse, PlaidLinkTokenResponse } from '@/types'

export interface ConnectAccountResponse {
  accounts_created: number
  duplicates_skipped: number
  accounts: Account[]
}

type AccountsApiShape =
  | ApiResponse<Account[]>
  | PaginatedResponse<Account>
  | Account[]

const isPaginatedResponse = (data: unknown): data is PaginatedResponse<Account> => {
  return (
    !!data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as PaginatedResponse<Account>).results)
  )
}

const isStandardApiResponse = (data: unknown): data is ApiResponse<Account[]> => {
  return (
    !!data &&
    typeof data === 'object' &&
    'status' in data &&
    'data' in data &&
    (data as ApiResponse<unknown>).status !== undefined
  )
}

export const accountService = {
  async createLinkToken(): Promise<ApiResponse<PlaidLinkTokenResponse>> {
    const response = await apiClient.post<ApiResponse<PlaidLinkTokenResponse>>(
      '/accounts/create-link-token/'
    )
    return response.data
  },

  async connectAccount(params: {
    publicToken: string
    institutionId: string
    institutionName?: string
    selectedAccountIds: string[]
  }): Promise<ApiResponse<ConnectAccountResponse>> {
    const response = await apiClient.post<ApiResponse<ConnectAccountResponse>>('/accounts/connect/', {
      public_token: params.publicToken,
      institution_id: params.institutionId,
      institution_name: params.institutionName,
      selected_account_ids: params.selectedAccountIds,
    })
    return response.data
  },

  async listAccounts(): Promise<Account[]> {
    const response = await apiClient.get<AccountsApiShape>('/accounts/')
    const payload = response.data

    console.log('Raw accounts API response:', payload)

    interface RawAccountData {
      id?: string
      account_id?: string
      custom_name?: string
      name?: string
      institution_name?: string
      institutionName?: string
      account_type?: string
      accountType?: string
      account_number_masked?: string
      maskedAccountNumber?: string
      is_active?: boolean
      isActive?: boolean
      plaid_account_id?: string
      plaidAccountId?: string
      created_at?: string
      createdAt?: string
      updated_at?: string
      updatedAt?: string
      balance?: string
      [key: string]: unknown
    }

    let accounts: RawAccountData[] = []

    if (Array.isArray(payload)) {
      accounts = payload as unknown as RawAccountData[]
    } else if (isPaginatedResponse(payload)) {
      accounts = payload.results as unknown as RawAccountData[]
    } else if (isStandardApiResponse(payload)) {
      if (payload.status === 'success' && Array.isArray(payload.data)) {
        accounts = payload.data as unknown as RawAccountData[]
      } else {
        throw new Error(payload.message || 'Failed to fetch accounts')
      }
    } else {
      throw new Error('Unexpected accounts response format')
    }

    console.log('Extracted accounts array:', accounts)

    // Transform snake_case backend fields to camelCase frontend fields
    const transformed: Account[] = accounts
      .map((account: RawAccountData) => {
      const accountId = account.id || account.account_id
      const customName = account.custom_name || account.name || null
      const institutionName = account.institution_name || account.institutionName || ''
        
        // Ensure we have a valid ID - skip accounts without IDs
        if (!accountId) {
          console.error('Account missing ID after transformation:', account)
          return null
        }
        
        const result: Account = {
          // Required fields with guaranteed values
        id: accountId,
          institutionName: institutionName || 'Unknown Institution',
          accountType: account.account_type || account.accountType || 'unknown',
          balance: account.balance || '0',
        isActive: account.is_active !== undefined ? account.is_active : (account.isActive !== undefined ? account.isActive : true),
          // Optional fields
          name: customName || undefined,
          maskedAccountNumber: account.account_number_masked || account.maskedAccountNumber || undefined,
          plaidAccountId: account.plaid_account_id || account.plaidAccountId || undefined,
          createdAt: account.created_at || account.createdAt || undefined,
          updatedAt: account.updated_at || account.updatedAt || undefined,
        }
        
        console.log(`Transformed account: account_id=${account.account_id}, id=${result.id}, custom_name=${account.custom_name}, institution_name=${account.institution_name}, name=${result.name}, institutionName=${result.institutionName}, maskedNumber=${result.maskedAccountNumber}, isActive=${result.isActive}`)
      
      return result
    })
      .filter((account): account is Account => account !== null)

    console.log('Transformed accounts:', transformed)
    return transformed
  },

  async getAccount(id: string): Promise<ApiResponse<Account>> {
    const response = await apiClient.get<ApiResponse<Account>>(`/accounts/${id}/`)
    if (response.data.status === 'success' && response.data.data) {
      interface RawAccountData {
        id?: string
        account_id?: string
        custom_name?: string
        name?: string
        institution_name?: string
        institutionName?: string
        account_type?: string
        accountType?: string
        account_number_masked?: string
        maskedAccountNumber?: string
        is_active?: boolean
        isActive?: boolean
        plaid_account_id?: string
        plaidAccountId?: string
        created_at?: string
        createdAt?: string
        updated_at?: string
        updatedAt?: string
        balance?: string
        [key: string]: unknown
      }
      const account = response.data.data as RawAccountData
      // Transform snake_case backend fields to camelCase frontend fields
      response.data.data = {
        ...account,
        id: account.id || account.account_id,
        name: account.custom_name || account.name || null,
        institutionName: account.institution_name || account.institutionName || '',
        accountType: account.account_type || account.accountType || '',
        maskedAccountNumber: account.account_number_masked || account.maskedAccountNumber || '',
        isActive: account.is_active !== undefined ? account.is_active : (account.isActive !== undefined ? account.isActive : true),
        plaidAccountId: account.plaid_account_id || account.plaidAccountId,
        createdAt: account.created_at || account.createdAt,
        updatedAt: account.updated_at || account.updatedAt,
      } as Account
    }
    return response.data
  },

  async updateAccount(id: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
    const response = await apiClient.patch<ApiResponse<Account>>(`/accounts/${id}/`, data)
    return response.data
  },

  async syncAccount(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>(`/accounts/${id}/sync/`)
    return response.data
  },

  async disconnectAccount(id: string): Promise<ApiResponse<null>> {
    // Use DELETE endpoint to actually delete the account from the database
    const response = await apiClient.delete<ApiResponse<null>>(`/accounts/${id}/`)
    return response.data
  },
}

