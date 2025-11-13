/**
 * Accounts hook
 */
import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { accountService } from '@/services/accountService'
import type { Account, AccountConnectionData } from '@/types/account.types'

interface LinkTokenParams {
  products?: string[]
  webhook?: string
  access_token?: string
  account_filters?: Record<string, string[]>
}

export function useAccounts() {
  const queryClient = useQueryClient()
  const linkTokenParamsRef = useRef<LinkTokenParams | undefined>(undefined)

  // Get accounts
  const {
    data: accountsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await accountService.getAccounts()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch accounts')
    },
    staleTime: 30000,
  })

  // Get account by ID
  const useAccount = (accountId: string) =>
    useQuery({
      queryKey: ['accounts', accountId],
      queryFn: async () => {
        const response = await accountService.getAccount(accountId)
        if (response.status === 'success' && response.data) {
          return response.data
        }
        throw new Error(response.message || 'Failed to fetch account')
      },
      enabled: !!accountId,
    })

  // Create link token
  const linkTokenQuery = useQuery({
    queryKey: ['accounts', 'link-token'],
    queryFn: async () => {
      const response = await accountService.createLinkToken(linkTokenParamsRef.current)
      if (response.status === 'success' && response.data) {
        return response.data.link_token
      }
      throw new Error(response.message || 'Failed to create link token')
    },
    enabled: false,
    retry: false,
    onError: (err: unknown) => {
      if (err instanceof Error) {
        toast.error(err.message)
      }
    },
  })

  // Connect account mutation
  const connectAccountMutation = useMutation({
    mutationFn: async (data: AccountConnectionData) => {
      const response = await accountService.connectAccount(data)
      if (response.status === 'success') {
        return response.data
      }
      throw new Error(response.message || 'Failed to connect account')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account connected successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to connect account')
    },
  })

  // Sync account mutation
  const syncAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await accountService.syncAccount(accountId)
      if (response.status === 'success') {
        return accountId
      }
      throw new Error(response.message || 'Failed to sync account')
    },
    onSuccess: async () => {
      // Refetch accounts to get updated last_synced_at
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Account sync initiated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync account')
    },
  })

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await accountService.deleteAccount(accountId)
      if (response.status === 'success') {
        return accountId
      }
      throw new Error(response.message || 'Failed to delete account')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account disconnected successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete account')
    },
  })

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ accountId, updates }: { accountId: string; updates: Partial<Pick<Account, 'custom_name'>> }) => {
      const response = await accountService.updateAccount(accountId, updates)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to update account')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update account')
    },
  })

  return {
    accounts: accountsData || [],
    isLoading,
    error,
    refetch,
    useAccount,
    createLinkToken: (params?: LinkTokenParams) => {
      linkTokenParamsRef.current = params
      return linkTokenQuery.refetch()
    },
    linkToken: linkTokenQuery.data,
    isCreatingLinkToken: linkTokenQuery.isFetching,
    connectAccount: connectAccountMutation.mutateAsync,
    isConnecting: connectAccountMutation.isPending,
    syncAccount: syncAccountMutation.mutateAsync,
    isSyncing: syncAccountMutation.isPending,
    deleteAccount: deleteAccountMutation.mutate,
    isDeleting: deleteAccountMutation.isPending,
    updateAccount: updateAccountMutation.mutateAsync,
    isUpdating: updateAccountMutation.isPending,
  }
}

