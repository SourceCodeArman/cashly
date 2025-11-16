/**
 * Pricing modal component
 * Displays pricing tiers and handles plan selection
 */
import { useNavigate } from 'react-router-dom'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'

interface PricingTier {
  name: string
  price: {
    monthly: string
    annual: string
  }
  description: string
  features: string[]
  cta: string
  popular?: boolean
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: {
      monthly: '$0',
      annual: '$0',
    },
    description: 'Perfect for getting started',
    features: [
      'Basic transaction tracking',
      'One connected account',
      'Basic categorization',
      'Monthly spending reports',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Premium',
    price: {
      monthly: '$9.99',
      annual: '$99.99',
    },
    description: 'For individuals who want more control',
    features: [
      'Everything in Free',
      'Unlimited connected accounts',
      'Advanced categorization',
      'AI-powered insights',
      'Budget tracking',
      'Export reports',
      'Priority support',
    ],
    cta: 'Choose Premium',
    popular: true,
  },
  {
    name: 'Pro',
    price: {
      monthly: '$19.99',
      annual: '$199.99',
    },
    description: 'For power users and professionals',
    features: [
      'Everything in Premium',
      'Advanced analytics',
      'Goal tracking',
      'Custom categories',
      'API access',
      'White-label reports',
      'Dedicated support',
      'Early access to features',
    ],
    cta: 'Choose Pro',
  },
]

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const navigate = useNavigate()

  const handleChoosePlan = (tierName: string) => {
    const planLower = tierName.toLowerCase()
    // Navigate to register page with plan parameter
    // After sign up, user will be redirected to dashboard with checkout modal
    navigate(`/register?plan=${planLower}`)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Your Plan"
      size="xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
        {pricingTiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-lg border-2 p-6 flex flex-col ${
              tier.popular
                ? 'border-primary-500 bg-primary-50 shadow-lg'
                : 'border-gray-200 bg-white'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{tier.description}</p>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {tier.price.monthly}
                  </span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {tier.price.annual !== '$0' && (
                    <span>{tier.price.annual}/year (save 17%)</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant={tier.popular ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => handleChoosePlan(tier.name)}
            >
              {tier.cta}
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

