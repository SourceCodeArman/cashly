/**
 * Billing cycle selector component
 * Toggle between monthly and annual billing
 */
import { CheckIcon } from '@heroicons/react/24/solid'
import type { BillingCycle } from '@/types/subscription.types'

interface BillingCycleSelectorProps {
  value: BillingCycle
  onChange: (cycle: BillingCycle) => void
  className?: string
}

export default function BillingCycleSelector({ value, onChange, className = '' }: BillingCycleSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Billing Cycle:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${value === 'monthly'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onChange('annual')}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${value === 'annual'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          Annual
        </button>
      </div>
    </div>
  )
}

