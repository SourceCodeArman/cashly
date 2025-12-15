import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const TIERS = [
    {
        id: 'free',
        name: 'Free Tier',
        description: 'Kickstart smarter spending with core tracking tools.',
        price: 0,
        priceDisplay: '$0',
        currency: 'usd',
        features: [
            'Up to 3 connected accounts',
            'Basic transaction tracking',
            'Monthly spending reports',
            'Mobile app access',
        ],
        badge: 'Start for free',
        buttonText: 'Get Started for Free',
        redirect: '/dashboard',
    },
    {
        id: 'pro',
        name: 'Pro Tier',
        description: 'Unlock advanced planning tools for growing households.',
        price: 12.99,
        annualPrice: 99.0,
        priceDisplay: '$12.99',
        annualPriceDisplay: '$99.00',
        currency: 'usd',
        features: [
            'Up to 10 connected accounts',
            'AI categorization enabled',
            'Advanced analytics & insights',
            'Custom categories & budgets',
            'Goal tracking & forecasting',
            'Export to CSV/PDF',
            'Priority support',
            'Unlimited transaction history',
        ],
        badge: 'Most popular',
        highlight: 'Includes AI insights',
        buttonText: 'Subscribe to Pro',
        redirect: '/subscription?checkout=true&tier=pro',
    },
    {
        id: 'premium',
        name: 'Premium Tier',
        description: 'Enterprise-grade insights plus concierge-level guidance.',
        price: 19.99,
        annualPrice: 199.0,
        priceDisplay: '$19.99',
        annualPriceDisplay: '$199.00',
        currency: 'usd',
        features: [
            'Everything in Pro',
            'Investment portfolio tracking',
            'Tax optimization suggestions',
            'Dedicated account manager',
            'Custom integrations',
            'Advanced security features',
        ],
        badge: 'All-access',
        highlight: 'Includes dedicated advisor',
        buttonText: 'Subscribe to Premium',
        redirect: '/subscription?checkout=true&tier=premium',
    },
]

export function Pricing() {
    const [isAnnual, setIsAnnual] = useState(false)
    const navigate = useNavigate()

    const handleSubscribe = (tier: typeof TIERS[0]) => {
        const redirectUrl = tier.id === 'free'
            ? '/dashboard'
            : `/subscription?checkout=true&tier=${tier.id}&cycle=${isAnnual ? 'annual' : 'monthly'}`

        navigate(`/register?redirect=${encodeURIComponent(redirectUrl)}`)
    }

    return (
        <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-[#E3E8D3] selection:text-[#1A1A1A] overflow-x-hidden w-full flex flex-col">
            <LandingNavbar />

            <main className="flex-grow pt-32 pb-20 w-full md:pt-48 md:pb-32 px-6 xl:px-0">
                <div className="max-w-[1400px] mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl md:text-7xl font-serif tracking-tight mb-8 leading-[0.9]"
                        >
                            Simple, transparent <br />
                            <span className="italic text-[#3A4D39]">pricing.</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-[#1A1A1A]/60 mb-10 leading-relaxed"
                        >
                            Choose the plan that's right for you. All plans include a 7-day free trial.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-center gap-6"
                        >
                            <span className={cn("text-base font-medium cursor-pointer transition-colors", !isAnnual ? "text-[#1A1A1A]" : "text-[#1A1A1A]/40")} onClick={() => setIsAnnual(false)}>Monthly</span>
                            <Switch
                                id="billing-mode"
                                checked={isAnnual}
                                onCheckedChange={setIsAnnual}
                                className="data-[state=checked]:bg-[#3A4D39]"
                            />
                            <span className={cn("text-base font-medium cursor-pointer transition-colors flex items-center gap-2", isAnnual ? "text-[#1A1A1A]" : "text-[#1A1A1A]/40")} onClick={() => setIsAnnual(true)}>
                                Annual
                                <span className="inline-flex items-center rounded-full bg-[#E3E8D3] px-2.5 py-0.5 text-xs font-bold text-[#3A4D39]">
                                    Save 20%
                                </span>
                            </span>
                        </motion.div>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-3 lg:gap-8 max-w-7xl mx-auto">
                        {TIERS.map((tier, index) => (
                            <motion.div
                                key={tier.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index + 1) }}
                                className="h-full"
                            >
                                <div
                                    className={cn(
                                        "relative flex h-full flex-col p-8 rounded-[2rem] transition-all duration-300 hover:shadow-xl border",
                                        tier.id === 'pro'
                                            ? "bg-[#1A1A1A] text-white border-[#1A1A1A] scale-105 shadow-2xl z-10"
                                            : "bg-[#FAFAFA] text-[#1A1A1A] border-[#1A1A1A]/5 hover:border-[#1A1A1A]/10"
                                    )}
                                >
                                    {tier.id === 'pro' && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#E3E8D3] text-[#3A4D39] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                                            Most Popular
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <h3 className={cn("text-2xl font-serif font-bold mb-2", tier.id === 'pro' ? "text-white" : "text-[#1A1A1A]")}>{tier.name}</h3>
                                        <p className={cn("text-sm leading-relaxed opacity-60", tier.id === 'pro' ? "text-white" : "text-[#1A1A1A]")}>{tier.description}</p>
                                    </div>

                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-serif font-bold tracking-tight">
                                                {isAnnual && tier.annualPriceDisplay ? tier.annualPriceDisplay : tier.priceDisplay}
                                            </span>
                                            {tier.price > 0 && (
                                                <span className="opacity-60 font-medium">
                                                    /{isAnnual ? 'year' : 'month'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 mb-8">
                                        <div className="text-sm font-bold uppercase tracking-widest opacity-40 mb-6">Includes</div>
                                        <ul className="space-y-4">
                                            {tier.features.map((feature) => (
                                                <li key={`${tier.id}-${feature}`} className="flex items-start gap-3 text-sm">
                                                    <div className={cn(
                                                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0",
                                                        tier.id === 'pro' ? "bg-[#E3E8D3] text-[#1A1A1A]" : "bg-[#1A1A1A]/5 text-[#1A1A1A]"
                                                    )}>
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                    <span className="opacity-80 leading-tight">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Button
                                        className={cn(
                                            "w-full h-14 rounded-full text-base font-bold transition-all hover:scale-[1.02]",
                                            tier.id === 'pro'
                                                ? "bg-[#E3E8D3] text-[#1A1A1A] hover:bg-[#E3E8D3]/90"
                                                : "bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90"
                                        )}
                                        onClick={() => handleSubscribe(tier)}
                                    >
                                        {tier.buttonText}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    )
}

