/**
 * Stripe Card Elements component
 * Provides PCI-compliant card input fields using Stripe Elements
 */
import { useState, useCallback } from 'react'
import { useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js'
import type { StripeCardNumberElementChangeEvent, StripeCardElementChangeEvent } from '@stripe/stripe-js'

interface StripeCardElementsProps {
  onCardComplete?: (complete: boolean) => void
  disableAutofill?: boolean
}

const baseInputStyle = {
  base: {
    fontSize: '16px',
    color: '#374151',
    '::placeholder': {
      color: '#9CA3AF',
    },
  },
  invalid: {
    color: '#EF4444',
  },
}

export default function StripeCardElements({ onCardComplete, disableAutofill = true }: StripeCardElementsProps) {
  const elements = useElements()
  const [cardNumberComplete, setCardNumberComplete] = useState(false)
  const [expiryComplete, setExpiryComplete] = useState(false)
  const [cvcComplete, setCvcComplete] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const handleCardNumberChange = useCallback((event: StripeCardNumberElementChangeEvent) => {
    setCardNumberComplete(event.complete)
    setCardError(event.error?.message || null)
    
    const allComplete = event.complete && expiryComplete && cvcComplete
    onCardComplete?.(allComplete)
  }, [expiryComplete, cvcComplete, onCardComplete])

  const handleExpiryChange = useCallback((event: StripeCardElementChangeEvent) => {
    setExpiryComplete(event.complete)
    
    const allComplete = cardNumberComplete && event.complete && cvcComplete
    onCardComplete?.(allComplete)
  }, [cardNumberComplete, cvcComplete, onCardComplete])

  const handleCvcChange = useCallback((event: StripeCardElementChangeEvent) => {
    setCvcComplete(event.complete)
    
    const allComplete = cardNumberComplete && expiryComplete && event.complete
    onCardComplete?.(allComplete)
  }, [cardNumberComplete, expiryComplete, onCardComplete])

  if (!elements) {
    return (
      <div className="text-sm text-danger-600">
        Stripe Elements not initialized. Please ensure you're wrapped in an Elements provider.
      </div>
    )
  }

  const isCardComplete = cardNumberComplete && expiryComplete && cvcComplete

  return (
    <div className="space-y-4">
      {/* Card Number */}
      <div>
        <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 mb-1">
          Card Number
        </label>
        <div className="relative">
          <div className="px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <CardNumberElement
              id="card-number"
              options={{
                style: baseInputStyle,
                placeholder: '1234 5678 9012 3456',
                ...(disableAutofill && { disableAutofill: true }),
              }}
              onChange={handleCardNumberChange}
              onReady={(el) => {
                // Disable autofill to prevent browser warnings on localhost
                if (disableAutofill && el) {
                  ;(el as any).autocomplete = 'off'
                }
              }}
            />
          </div>
          {cardError && (
            <p className="mt-1 text-sm text-danger-600">{cardError}</p>
          )}
        </div>
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="card-expiry" className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date
          </label>
          <div className="px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <CardExpiryElement
              id="card-expiry"
              options={{
                style: baseInputStyle,
                placeholder: 'MM / YY',
              }}
              onChange={handleExpiryChange}
            />
          </div>
        </div>

        <div>
          <label htmlFor="card-cvc" className="block text-sm font-medium text-gray-700 mb-1">
            CVC
          </label>
          <div className="px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <CardCvcElement
              id="card-cvc"
              options={{
                style: baseInputStyle,
                placeholder: '123',
              }}
              onChange={handleCvcChange}
            />
          </div>
        </div>
      </div>

      {/* Expose completion state for parent component */}
      <input type="hidden" name="card-complete" value={isCardComplete ? 'true' : 'false'} />
    </div>
  )
}

// Export hook for parent components to check card completeness
export function useCardComplete() {
  const [isComplete, setIsComplete] = useState(false)
  
  const handleComplete = useCallback((complete: boolean) => {
    setIsComplete(complete)
  }, [])
  
  return { isComplete, handleComplete }
}

