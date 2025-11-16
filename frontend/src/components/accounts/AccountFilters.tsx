/**
 * Account filters component for searching, filtering, and sorting accounts
 */
import { useState } from 'react'
import Input from '@/components/common/Input'
import Select from '@/components/common/Select'
import Button from '@/components/common/Button'

export type AccountTypeFilter = 'all' | 'checking' | 'savings' | 'credit_card' | 'investment'
export type AccountStatusFilter = 'all' | 'active' | 'inactive'
export type AccountSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'balance_asc'
  | 'balance_desc'
  | 'last_synced_asc'
  | 'last_synced_desc'
  | 'type_asc'
  | 'type_desc'

export interface AccountFiltersState {
  search: string
  accountType: AccountTypeFilter
  status: AccountStatusFilter
  sortBy: AccountSortOption
}

export interface AccountFiltersProps {
  filters: AccountFiltersState
  onFiltersChange: (filters: AccountFiltersState) => void
  resultCount?: number
}

export default function AccountFilters({
  filters,
  onFiltersChange,
  resultCount,
}: AccountFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleAccountTypeChange = (value: string) => {
    onFiltersChange({ ...filters, accountType: value as AccountTypeFilter })
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value as AccountStatusFilter })
  }

  const handleSortChange = (value: string) => {
    onFiltersChange({ ...filters, sortBy: value as AccountSortOption })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      accountType: 'all',
      status: 'all',
      sortBy: 'name_asc',
    })
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.accountType !== 'all' ||
    filters.status !== 'all' ||
    filters.sortBy !== 'name_asc'

  const accountTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'investment', label: 'Investment' },
  ]

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]

  const sortOptions = [
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'balance_desc', label: 'Balance (High to Low)' },
    { value: 'balance_asc', label: 'Balance (Low to High)' },
    { value: 'last_synced_desc', label: 'Last Synced (Recent First)' },
    { value: 'last_synced_asc', label: 'Last Synced (Oldest First)' },
    { value: 'type_asc', label: 'Type (A-Z)' },
    { value: 'type_desc', label: 'Type (Z-A)' },
  ]

  return (
    <div className="space-y-4">
      {/* Search bar - always visible */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search by institution name or account number..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-white/30"
            leftIcon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
            fullWidth
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="whitespace-nowrap"
        >
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
        </Button>
        {hasActiveFilters && (
          <Button variant="secondary" onClick={handleClearFilters} size="sm">
            Clear
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Select
            label="Account Type"
            value={filters.accountType}
            onChange={(e) => handleAccountTypeChange(e.target.value)}
            options={accountTypeOptions}
            fullWidth
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={statusOptions}
            fullWidth
          />
          <Select
            label="Sort By"
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            options={sortOptions}
            fullWidth
          />
        </div>
      )}

      {/* Results count */}
      {resultCount !== undefined && (
        <div className="text-sm text-gray-600">
          {resultCount} {resultCount === 1 ? 'account' : 'accounts'} found
        </div>
      )}
    </div>
  )
}

