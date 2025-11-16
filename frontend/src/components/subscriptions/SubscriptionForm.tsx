/**
 * Subscription form component
 * Handles subscription creation with Stripe Elements
 */
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js'
import { CheckIcon } from '@heroicons/react/24/solid'
import { toast } from 'sonner'
import { subscriptionFormSchema, type SubscriptionFormData } from '@/utils/validators'
import type { SubscriptionPlan } from '@/types/subscription.types'
import { getStripeClient } from '@/utils/stripe'
import { createSubscription } from '@/services/subscriptionService'
import StripeCardElements from './StripeCardElements'
import BillingCycleSelector from './BillingCycleSelector'
import Button from '@/components/common/Button'

interface SubscriptionFormProps {
  plan: SubscriptionPlan
  onSuccess?: () => void
  onCancel?: () => void
}

function SubscriptionFormContent({ plan, onSuccess, onCancel }: SubscriptionFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  
  const [isCardComplete, setIsCardComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      plan,
      billing_cycle: 'monthly',
      trial_enabled: true,
    },
  })

  const billingCycle = watch('billing_cycle')
  const trialEnabled = watch('trial_enabled')

  const handleBillingCycleChange = (cycle: 'monthly' | 'annual') => {
    setValue('billing_cycle', cycle)
  }

  const onSubmit = async (data: SubscriptionFormData) => {
    if (!stripe || !elements) {
      toast.error('Stripe is not initialized. Please try again.')
      return
    }

    if (!isCardComplete) {
      toast.error('Please complete all card details')
      return
    }

    setIsSubmitting(true)

    try {
      // Get card element
      const cardNumberElement = elements.getElement('cardNumber')
      if (!cardNumberElement) {
        toast.error('Card element not found')
        setIsSubmitting(false)
        return
      }

      // Create payment method
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
      })

      if (pmError || !paymentMethod) {
        toast.error(pmError?.message || 'Failed to create payment method')
        setIsSubmitting(false)
        return
      }

      // Create subscription via API
      const subscriptionData = {
        payment_method_id: paymentMethod.id,
        plan: data.plan,
        billing_cycle: data.billing_cycle,
        trial_enabled: data.trial_enabled,
      }

      const response = await createSubscription(subscriptionData)

      if (response.status === 'success') {
        toast.success(
          data.trial_enabled
            ? 'Your 7-day free trial has started!'
            : 'Subscription created successfully!'
        )
        onSuccess?.()
      } else {
        toast.error(response.message || 'Failed to create subscription')
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      toast.error(error.message || 'An error occurred while creating your subscription')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Billing Cycle Selector */}
      <BillingCycleSelector
        value={billingCycle}
        onChange={handleBillingCycleChange}
      />

      {/* Card Details */}
      <StripeCardElements
        onCardComplete={setIsCardComplete}
        disableAutofill={true}
      />

      {/* Trial Checkbox */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="trial-enabled"
            type="checkbox"
            checked={trialEnabled}
            onChange={(e) => setValue('trial_enabled', e.target.checked)}
            className="sr-only"
          />
          <label
            htmlFor="trial-enabled"
            className="relative flex items-center justify-center w-5 h-5 cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              setValue('trial_enabled', !trialEnabled)
            }}
          >
            <div
              className={`w-5 h-5 border-2 rounded-md transition-all ${
                trialEnabled
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {trialEnabled && (
                <CheckIcon className="w-4 h-4 text-white absolute inset-0 m-auto" />
              )}
            </div>
          </label>
        </div>
        <label
          htmlFor="trial-enabled"
          className="ml-3 text-sm text-gray-700 cursor-pointer"
          onClick={() => setValue('trial_enabled', !trialEnabled)}
        >
          I agree to start a 7-day free trial. You'll be charged after the trial ends.
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            fullWidth
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          disabled={!isCardComplete || isSubmitting}
        >
          {trialEnabled ? 'Start 7-Day Free Trial' : 'Subscribe Now'}
        </Button>
      </div>
    </form>
  )
}

export default function SubscriptionForm({ plan, onSuccess, onCancel }: SubscriptionFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)

  useEffect(() => {
    getStripeClient().then((stripe) => {
      if (stripe) {
        setStripePromise(Promise.resolve(stripe))
      }
    })
  }, [])

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-600">Loading payment form...</div>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <SubscriptionFormContent plan={plan} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  )
}

