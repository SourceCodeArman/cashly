import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { PublicHeader } from '@/components/PublicHeader'
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

        // Encode the redirect URL to handle special characters properly
        navigate(`/register?redirect=${encodeURIComponent(redirectUrl)}`)
    }

    return (
        <div className="min-h-screen w-full bg-background overflow-x-hidden selection:bg-primary/20">
            {/* Background Gradients */}
            <div className="fixed inset-0 -z-10 h-full w-full bg-background">
                <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Header */}
            <PublicHeader />

            <div className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70"
                        >
                            Simple, transparent pricing
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-muted-foreground mb-8"
                        >
                            Choose the plan that's right for you. All plans include a 7-day free trial.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-center gap-4"
                        >
                            <Label htmlFor="billing-mode" className={cn("text-sm font-medium cursor-pointer", !isAnnual ? "text-foreground" : "text-muted-foreground")}>Monthly</Label>
                            <Switch
                                id="billing-mode"
                                checked={isAnnual}
                                onCheckedChange={setIsAnnual}
                            />
                            <Label htmlFor="billing-mode" className={cn("text-sm font-medium cursor-pointer", isAnnual ? "text-foreground" : "text-muted-foreground")}>
                                Annual <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Save 20%</span>
                            </Label>
                        </motion.div>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-3 lg:gap-8">
                        {TIERS.map((tier, index) => (
                            <motion.div
                                key={tier.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index + 1) }}
                            >
                                <Card
                                    className={cn(
                                        "relative flex h-full flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                                        tier.id === 'pro' ? "border-primary shadow-2xl shadow-primary/20 scale-105 z-10" : "border-border shadow-soft"
                                    )}
                                >
                                    {tier.id === 'pro' && (
                                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
                                    )}

                                    <CardHeader className={cn("pb-4", tier.id === 'pro' && "bg-primary/5")}>
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <CardTitle className={cn("text-xl", tier.id === 'pro' && "text-primary")}>{tier.name}</CardTitle>
                                                <CardDescription className="mt-1.5">{tier.description}</CardDescription>
                                            </div>
                                            {tier.badge && (
                                                <Badge
                                                    variant={tier.id === 'pro' ? 'default' : 'secondary'}
                                                    className={cn("text-xs text-nowrap shadow-sm", tier.id === 'pro' && "bg-primary text-primary-foreground")}
                                                >
                                                    {tier.badge}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex flex-1 flex-col space-y-6 pt-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold tracking-tight">
                                                {isAnnual && tier.annualPriceDisplay ? tier.annualPriceDisplay : tier.priceDisplay}
                                            </span>
                                            {tier.price > 0 && (
                                                <span className="text-muted-foreground font-medium">
                                                    /{isAnnual ? 'year' : 'month'}
                                                </span>
                                            )}
                                        </div>

                                        {tier.highlight && (
                                            <div className="rounded-lg bg-secondary/50 p-3 text-sm text-secondary-foreground border border-secondary">
                                                <span className="font-medium">✨ {tier.highlight}</span>
                                            </div>
                                        )}

                                        <div className="flex-1">
                                            <div className="text-sm font-medium mb-4 text-foreground/80">Includes:</div>
                                            <ul className="space-y-3 text-sm">
                                                {tier.features.map((feature) => (
                                                    <li key={`${tier.id}-${feature}`} className="flex items-start gap-3">
                                                        <div className={cn(
                                                            "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full",
                                                            tier.id === 'pro' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                        <span className="text-muted-foreground leading-tight">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <Button
                                            className={cn(
                                                "w-full h-12 text-base font-semibold shadow-md transition-all hover:scale-[1.02]",
                                                tier.id === 'pro' && "shadow-primary/25 hover:shadow-primary/40"
                                            )}
                                            variant={tier.id === 'free' ? 'outline' : 'default'}
                                            onClick={() => handleSubscribe(tier)}
                                        >
                                            {tier.buttonText}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
