/**
 * Transaction filters component
 */
import { useState } from 'react'
import { startOfDay, parseISO } from 'date-fns'
import Input from '@/components/common/Input'
import DateInput from '@/components/common/DateInput'
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
          {(filters.date_from || filters.date_to || filters.category || filters.account || filters.search) && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="bg-white/30 p-4 rounded-lg border border-gray-200 space-y-4">
          <Input
            label="Search"
            type="text"
            value={filters.search || ''}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            placeholder="Search transactions..."
            className="bg-white/30"
          />

          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="From Date"
              value={filters.date_from}
              onChange={(value) =>
                onFiltersChange({ ...filters, date_from: value })
              }
              placeholder="mm/dd/yyyy"
              maxDate={filters.date_to ? parseISO(filters.date_to) : startOfDay(new Date())}
              className="bg-white/30"
            />

            <DateInput
              label="To Date"
              value={filters.date_to}
              onChange={(value) =>
                onFiltersChange({ ...filters, date_to: value })
              }
              placeholder="mm/dd/yyyy"
              minDate={filters.date_from ? parseISO(filters.date_from) : undefined}
              maxDate={startOfDay(new Date())}
              className="bg-white/30"
            />
          </div>
        </div>
      )}
    </div>
  )
}

