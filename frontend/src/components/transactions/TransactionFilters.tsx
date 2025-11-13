/**
 * Transaction filters component
 */
import { useState } from 'react'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import type { TransactionFilters as TransactionFiltersType } from '@/types/transaction.types'

export interface TransactionFiltersProps {
  filters: TransactionFiltersType
  onFiltersChange: (filters: TransactionFiltersType) => void
  onClear: () => void
  isOpen?: boolean
  onToggle?: () => void
  hideToggleButton?: boolean
}

export default function TransactionFilters({
  filters,
  onFiltersChange,
  onClear,
  isOpen,
  onToggle,
  hideToggleButton = false,
}: TransactionFiltersProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = typeof isOpen === 'boolean' ? isOpen : internalOpen
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalOpen(!internalOpen)
    }
  }

  return (
    <div className="mb-4">
      {!hideToggleButton && (
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggle}
          >
            {open ? 'Hide' : 'Show'} Filters
          </Button>
          {(filters.date_from || filters.category || filters.search) && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <Input
            label="Search"
            type="text"
            value={filters.search || ''}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            placeholder="Search transactions..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Date"
              type="date"
              value={filters.date_from || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, date_from: e.target.value })
              }
            />

            <Input
              label="To Date"
              type="date"
              value={filters.date_to || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, date_to: e.target.value })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

