import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import type { Account } from '@/types'
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      const accounts = await accountService.listAccounts()
      console.log('Raw accounts from API:', accounts)
      // Double-check transformation and filter out inactive accounts
      const transformed = accounts
        .map((account) => ({
          ...account,
          id: account.id,
        }))
        .filter((account) => {
          const isActive = account.isActive !== false
          console.log(`Account ${account.id}: isActive=${account.isActive}, willKeep=${isActive}`)
          return isActive
        })
      console.log('Filtered active accounts:', transformed)
      return transformed
    },
  })
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: queryKeys.account(id),
    queryFn: async () => {
      const response = await accountService.getAccount(id)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch account')
    },
    enabled: !!id,
  })
}

export function useSyncAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => accountService.syncAccount(id),
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      toast.success('Account synced successfully')
      return accountId
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync account')
    },
  })
}

export function useSyncAllAccounts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountIds: string[]) => {
      if (!accountIds || accountIds.length === 0) {
        throw new Error('No accounts to sync')
      }
      
      // Sync all accounts in parallel
      const results = await Promise.allSettled(
        accountIds.map((id) => accountService.syncAccount(id))
      )
      
      // Check if any failed
      const failures = results.filter((result) => result.status === 'rejected')
      const successes = results.filter((result) => result.status === 'fulfilled')
      
      if (failures.length > 0) {
        throw new Error(`Failed to sync ${failures.length} of ${accountIds.length} account(s)`)
      }
      
      return { synced: successes.length, total: accountIds.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      toast.success(`Successfully synced ${data.synced} account(s)`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync all accounts')
    },
  })
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        console.log('Calling disconnectAccount service with ID:', id)
        const response = await accountService.disconnectAccount(id)
        console.log('Disconnect response:', response)
        return { response, accountId: id }
      } catch (error) {
        console.error('Error in disconnectAccount mutationFn:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      const accountId = data.accountId
      console.log('Disconnect mutation succeeded for account:', accountId)
      console.log('Current cache data before update:', queryClient.getQueryData(queryKeys.accounts))
      
      // Remove the account from cache immediately for better UX
      queryClient.setQueryData(queryKeys.accounts, (oldData: Account[] | undefined) => {
        if (!oldData) {
          console.log('No old data to update')
          return oldData
        }
        console.log('Filtering accounts. Old data:', oldData)
        const filtered = oldData.filter((account) => {
          const accId = String(account.id)
          const targetId = String(accountId)
          const matches = accId === targetId
          const isInactive = account.isActive === false
          console.log(`Account ${accId}: matches=${matches} (${accId} === ${targetId}), isInactive=${isInactive}, willKeep=${!matches && !isInactive}`)
          return !matches && !isInactive
        })
        console.log('Filtered accounts:', filtered)
        return filtered
      })
      
      console.log('Cache data after update:', queryClient.getQueryData(queryKeys.accounts))
      
      // Refetch after a short delay to ensure backend has processed the update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      }, 500)
      
      toast.success('Account disconnected successfully')
    },
    onError: (error: unknown) => {
      console.error('Disconnect mutation error:', error)
      interface ErrorWithResponse {
        response?: {
          data?: {
            message?: string
          }
        }
        message?: string
      }
      const err = error as ErrorWithResponse
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to disconnect account'
      toast.error(errorMessage)
    },
  })
}

export function useDisconnectAllAccounts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountIds: string[]) => {
      if (!accountIds || accountIds.length === 0) {
        throw new Error('No accounts to disconnect')
      }
      
      // Disconnect all accounts in parallel
      const results = await Promise.allSettled(
        accountIds.map((id) => accountService.disconnectAccount(id))
      )
      
      // Check if any failed
      const failures = results.filter((result) => result.status === 'rejected')
      if (failures.length > 0) {
        throw new Error(`Failed to disconnect ${failures.length} account(s)`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      toast.success('All accounts disconnected successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to disconnect all accounts')
    },
  })
}

