/**
 * Stripe utilities for client-side initialization
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { getStripeConfig } from '@/services/subscriptionService'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get Stripe publishable key from backend or environment
 */
async function getPublishableKey(): Promise<string> {
  try {
    const config = await getStripeConfig()
    if (config.data?.publishable_key) {
      return config.data.publishable_key
    }
  } catch (error) {
    console.warn('[Stripe] Failed to fetch config from backend:', error)
  }

  // Fallback to environment variable
  const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  if (envKey) {
    return envKey
  }

  throw new Error(
    'Stripe publishable key not found. Please configure STRIPE_PUBLISHABLE_KEY in backend or VITE_STRIPE_PUBLISHABLE_KEY in environment.'
  )
}

/**
 * Initialize and return Stripe client
 * Caches the Stripe instance after first load
 */
export async function getStripeClient(): Promise<Stripe | null> {
  if (stripePromise) {
    return stripePromise
  }

  stripePromise = (async () => {
    try {
      const publishableKey = await getPublishableKey()
      
      if (!publishableKey || publishableKey.trim() === '') {
        console.error('[Stripe] Publishable key is empty')
        return null
      }

      const stripe = await loadStripe(publishableKey)
      if (!stripe) {
        console.error('[Stripe] Failed to load Stripe')
        return null
      }

      return stripe
    } catch (error) {
      console.error('[Stripe] Error initializing:', error)
      return null
    }
  })()

  return stripePromise
}

/**
 * Reset Stripe client (useful for testing or re-initialization)
 */
export function resetStripeClient() {
  stripePromise = null
}

