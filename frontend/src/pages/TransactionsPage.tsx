/**
 * Transactions page
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAllTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { transactionService } from '@/services/transactionService'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionFilters from '@/components/transactions/TransactionFilters'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import Pagination from '@/components/common/Pagination'
import { formatAccountType, getLastFourDigits } from '@/utils/formatters'
import { toast } from 'sonner'
import { cn } from '@/utils/helpers'
import type { TransactionFilters as TransactionFiltersType } from '@/types/transaction.types'

const PAGE_SIZE = 20

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFiltersType>({ page: 1 })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined)
  const { accounts: accountsWithCounts, isLoading: isLoadingAccounts } = useAccounts()
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  
  // Remove account, search, and page from filters for the base query (we'll filter client-side)
  // Keep date, category, and other filters that should be server-side
  const baseFilters = useMemo(() => {
    const { account, search, page, ...rest } = filters
    return rest
  }, [filters])
  
  // Fetch all transactions (excluding account and search filters) - this will be cached
  const { transactions: allTransactions, isLoading: isLoadingAll, error: errorAll, refetch: refetchAll } = useAllTransactions(baseFilters)
  
  // Create mutation for categorizing transactions
  const queryClient = useQueryClient()
  const categorizeMutation = useMutation({
    mutationFn: async ({ transactionId, categoryId }: { transactionId: string; categoryId: string }) => {
      const response = await transactionService.categorizeTransaction(transactionId, categoryId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to categorize transaction')
    },
    onSuccess: () => {
      // Invalidate all transaction queries to refetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Transaction categorized')
      // Refetch all transactions
      refetchAll()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to categorize transaction')
    },
  })
  
  // Filter accounts to only show credit_card, savings, and checking
  const filteredAccounts = useMemo(() => {
    if (!accountsWithCounts || !Array.isArray(accountsWithCounts)) {
      return []
    }
    return accountsWithCounts.filter(
      account => 
        account.account_type === 'credit_card' || 
        account.account_type === 'savings' || 
        account.account_type === 'checking'
    )
  }, [accountsWithCounts])

  // Filter transactions by selected account (client-side)
  const filteredByAccount = useMemo(() => {
    if (!allTransactions || !Array.isArray(allTransactions)) {
      return []
    }
    if (!selectedAccountId) {
      // When "All Accounts" is selected, filter to only show transactions from filtered accounts
      // But if filteredAccounts is empty (accounts not loaded yet), show all transactions
      if (filteredAccounts.length === 0) {
        return allTransactions
      }
      const filteredAccountIds = new Set(filteredAccounts.map(acc => String(acc.account_id)))
      const filtered = allTransactions.filter(t => filteredAccountIds.has(String(t.account)))
      // If filtering results in empty but we have transactions, show all (data inconsistency)
      // This prevents UI from breaking if account types don't match transaction accounts
      return filtered.length > 0 ? filtered : allTransactions
    }
    return allTransactions.filter(t => String(t.account) === String(selectedAccountId))
  }, [allTransactions, selectedAccountId, filteredAccounts])
  
  // Filter transactions by search query (client-side)
  const filteredBySearch = useMemo(() => {
    const searchQuery = filters.search?.toLowerCase().trim()
    if (!searchQuery) {
      return filteredByAccount
    }
    
    return filteredByAccount.filter(transaction => {
      // Search in merchant name
      const merchantMatch = transaction.merchant_name?.toLowerCase().includes(searchQuery)
      // Search in description
      const descriptionMatch = transaction.description?.toLowerCase().includes(searchQuery)
      // Search in category name
      const categoryMatch = transaction.category_name?.toLowerCase().includes(searchQuery)
      // Search in account name
      const accountMatch = transaction.account_name?.toLowerCase().includes(searchQuery)
      // Search in amount (convert to string and search)
      const amountMatch = transaction.formatted_amount?.toLowerCase().includes(searchQuery) ||
                         transaction.amount?.toLowerCase().includes(searchQuery)
      
      return merchantMatch || descriptionMatch || categoryMatch || accountMatch || amountMatch
    })
  }, [filteredByAccount, filters.search])
  
  // Apply client-side pagination
  const currentPage = filters.page || 1
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE
    return filteredBySearch.slice(startIndex, endIndex)
  }, [filteredBySearch, currentPage])
  
  const totalPages = Math.ceil(filteredBySearch.length / PAGE_SIZE)
  const isLoading = isLoadingAll
  const error = errorAll
  const refetch = refetchAll
  
  // Debug logging (only in development, and only when transactions change)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isLoading) {
      console.log('💳 [TransactionsPage]', {
        selectedAccountId,
        searchQuery: filters.search,
        totalTransactions: allTransactions.length,
        filteredByAccount: filteredByAccount.length,
        filteredBySearch: filteredBySearch.length,
        paginatedCount: paginatedTransactions.length,
        currentPage,
        totalPages,
        filters: baseFilters,
        accountIds: allTransactions.length > 0 
          ? [...new Set(allTransactions.map(t => t.account))] 
          : [],
      })
    }
  }, [allTransactions, filteredByAccount, filteredBySearch, paginatedTransactions, selectedAccountId, currentPage, totalPages, baseFilters, filters.search, isLoading])
  
  // Get account IDs that have transactions
  const accountsWithTransactions = useMemo(() => {
    if (!allTransactions || !Array.isArray(allTransactions)) {
      return new Set<string>()
    }
    return new Set(allTransactions.map(t => String(t.account)))
  }, [allTransactions])

  // Create account tabs - only show accounts that have transactions
  const allTabs = useMemo(() => {
    const tabs: Array<{ id?: string; label: string }> = [
      { id: undefined, label: 'All Accounts' }
    ]
    
    // Only show accounts that have transactions
    if (accountsWithCounts && Array.isArray(accountsWithCounts)) {
      accountsWithCounts.forEach((account) => {
        const accountId = String(account.account_id)
        // Only add tab if this account has transactions
        if (accountsWithTransactions.has(accountId)) {
          const displayName = account.custom_name || account.institution_name
          const accountType = formatAccountType(account.account_type)
          const lastFour = getLastFourDigits(account.account_number_masked)
          
          let label = displayName
          if (accountType) {
            label += ` • ${accountType}`
          }
          if (lastFour) {
            label += ` • ${lastFour}`
          }
          
          tabs.push({
            id: accountId,
            label,
          })
        }
      })
    }
    
    return tabs
  }, [accountsWithCounts, accountsWithTransactions])

  // Get selected account name for display
  const selectedAccountName = useMemo(() => {
    if (!selectedAccountId) return null
    if (!accountsWithCounts || !Array.isArray(accountsWithCounts)) return null
    const account = accountsWithCounts.find(acc => String(acc.account_id) === String(selectedAccountId))
    if (!account) return null
    return account.custom_name || account.institution_name
  }, [selectedAccountId, accountsWithCounts])

  // Handle account filter change
  const handleAccountFilter = (accountId: string | undefined) => {
    setSelectedAccountId(accountId)
    // Reset to page 1 when changing accounts
    setFilters({ ...filters, page: 1 })
  }

  // Update sliding indicator position
  useEffect(() => {
    if (!navRef.current || !indicatorRef.current) return

    const activeIndex = allTabs.findIndex(
      tab => tab.id === undefined ? !selectedAccountId : selectedAccountId === tab.id
    )

    if (activeIndex === -1) return

    const activeTab = tabRefs.current[activeIndex]
    if (!activeTab) return

    const navRect = navRef.current.getBoundingClientRect()
    const tabRect = activeTab.getBoundingClientRect()

    const left = tabRect.left - navRect.left
    const width = tabRect.width

    indicatorRef.current.style.width = `${width}px`
    indicatorRef.current.style.transform = `translateX(${left}px)`
  }, [selectedAccountId, allTabs])

  const handleCategorize = (transactionId: string, categoryId: string) => {
    if (!categoryId) {
      return // Don't allow empty category for now
    }
    categorizeMutation.mutate({ transactionId, categoryId })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          {selectedAccountName ? (
            <p className="text-gray-600 mt-1">
              Viewing transactions for <span className="font-semibold text-gray-900">{selectedAccountName}</span>
            </p>
          ) : (
            <p className="text-gray-600 mt-1">View and manage your transactions</p>
          )}
        </div>
        <div className="ml-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </div>

      <TransactionFilters
        filters={filters}
        onFiltersChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
        onClear={() => setFilters({ page: 1 })}
        isOpen={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
        hideToggleButton
      />

      {allTabs.length > 0 && (
        <div className="border-b border-gray-200 relative bg-white/30 rounded-lg shadow-sm">
          <nav
            ref={navRef}
            className="flex flex-wrap relative"
            aria-label="Account tabs"
          >
            {/* Sliding indicator */}
            <div
              ref={indicatorRef}
              className="absolute bottom-0 h-0.5 bg-violet-500 transition-all duration-300 ease-out"
              style={{ width: '0px', transform: 'translateX(0px)' }}
            />

            {allTabs.map((tab, index) => {
              const isSelected =
                tab.id === undefined
                  ? !selectedAccountId
                  : selectedAccountId === tab.id

              return (
                <button
                  key={tab.id || 'all'}
                  ref={(el) => {
                    tabRefs.current[index] = el
                  }}
                  onClick={() => handleAccountFilter(tab.id)}
                  className={cn(
                    'flex-1 min-w-0 px-4 py-3 text-sm font-medium transition-colors relative',
                    'text-center overflow-hidden text-ellipsis whitespace-nowrap',
                    isSelected
                      ? 'text-violet-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorMessage
          title="Failed to load transactions"
          message={error instanceof Error ? error.message : 'An error occurred'}
          onRetry={() => refetch()}
        />
      ) : (
        <TransactionList 
          transactions={paginatedTransactions} 
          onCategorize={handleCategorize}
        />
      )}

      {filteredBySearch.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={filteredBySearch.length}
          pageSize={PAGE_SIZE}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      )}
    </div>
  )
}
