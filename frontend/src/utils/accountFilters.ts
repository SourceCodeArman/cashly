/**
 * Utility functions for filtering and sorting accounts
 */
import type { Account } from '@/types/account.types'
import type {
  AccountFiltersState,
  AccountSortOption,
} from '@/components/accounts/AccountFilters'

/**
 * Filter accounts based on search query, account type, and status
 */
export function filterAccounts(
  accounts: Account[],
  filters: AccountFiltersState
): Account[] {
  return accounts.filter((account) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch =
        (account.custom_name
          ? account.custom_name.toLowerCase().includes(searchLower)
          : false) ||
        account.institution_name.toLowerCase().includes(searchLower) ||
        account.account_number_masked.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Account type filter
    if (filters.accountType !== 'all') {
      if (account.account_type !== filters.accountType) return false
    }

    // Status filter
    if (filters.status !== 'all') {
      const isActive = account.is_active
      if (filters.status === 'active' && !isActive) return false
      if (filters.status === 'inactive' && isActive) return false
    }

    return true
  })
}

/**
 * Sort accounts based on the selected sort option
 */
export function sortAccounts(
  accounts: Account[],
  sortBy: AccountSortOption
): Account[] {
  const sorted = [...accounts]

  switch (sortBy) {
    case 'name_asc':
      return sorted.sort((a, b) =>
        a.institution_name.localeCompare(b.institution_name)
      )

    case 'name_desc':
      return sorted.sort((a, b) =>
        b.institution_name.localeCompare(a.institution_name)
      )

    case 'balance_desc':
      return sorted.sort(
        (a, b) => parseFloat(b.balance) - parseFloat(a.balance)
      )

    case 'balance_asc':
      return sorted.sort(
        (a, b) => parseFloat(a.balance) - parseFloat(b.balance)
      )

    case 'last_synced_desc':
      return sorted.sort((a, b) => {
        const aDate = a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0
        const bDate = b.last_synced_at ? new Date(b.last_synced_at).getTime() : 0
        return bDate - aDate
      })

    case 'last_synced_asc':
      return sorted.sort((a, b) => {
        const aDate = a.last_synced_at
          ? new Date(a.last_synced_at).getTime()
          : Number.MAX_SAFE_INTEGER
        const bDate = b.last_synced_at
          ? new Date(b.last_synced_at).getTime()
          : Number.MAX_SAFE_INTEGER
        return aDate - bDate
      })

    case 'type_asc':
      return sorted.sort((a, b) =>
        a.account_type.localeCompare(b.account_type)
      )

    case 'type_desc':
      return sorted.sort((a, b) =>
        b.account_type.localeCompare(a.account_type)
      )

    default:
      return sorted
  }
}

/**
 * Apply filters and sorting to accounts
 */
export function applyAccountFilters(
  accounts: Account[],
  filters: AccountFiltersState
): Account[] {
  const filtered = filterAccounts(accounts, filters)
  return sortAccounts(filtered, filters.sortBy)
}

