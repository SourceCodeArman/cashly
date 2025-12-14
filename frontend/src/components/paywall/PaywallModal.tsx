import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface PaywallModalProps {
    isOpen: boolean
    onClose: () => void
    feature: string
    requiredPlan?: 'pro' | 'premium'
}

export function PaywallModal({ isOpen, onClose, feature, requiredPlan = 'pro' }: PaywallModalProps) {
    const navigate = useNavigate()

    const handleUpgrade = () => {
        onClose()
        navigate(`/subscription?checkout=true&tier=${requiredPlan}`)
    }

    const features = {
        'Custom Categories': [
            'Create unlimited custom categories',
            'Organize transactions your way',
            'Categorization rules & automation',
            'Better insights into spending',
        ],
        'Category Rules': [
            'Auto-categorize transactions',
            'Set merchant-based rules',
            'Amount-based categorization',
            'Save time on manual categorization',
        ],
    }

    const featureList = features[feature as keyof typeof features] || features['Custom Categories']

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-2xl">
                        Upgrade to {requiredPlan === 'pro' ? 'Pro' : 'Premium'}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {feature} is a premium feature. Upgrade to unlock full access.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-6">
                    <h4 className="mb-4 font-semibold text-foreground">
                        What you'll get:
                    </h4>
                    <ul className="space-y-3">
                        {featureList.map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className={cn(
                                    "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full",
                                    "bg-primary/10 text-primary"
                                )}>
                                    <Check className="h-3 w-3" />
                                </div>
                                <span className="text-sm text-muted-foreground">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    <Button
                        className="w-full"
                        onClick={handleUpgrade}
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to {requiredPlan === 'pro' ? 'Pro' : 'Premium'}
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={onClose}
                    >
                        Maybe later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
