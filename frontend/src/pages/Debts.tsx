import { useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebts } from '@/hooks/useDebts'
import { DebtCard } from '@/components/debts/DebtCard'
import { DebtSummaryCard } from '@/components/debts/DebtSummaryCard'
import { DebtStrategy } from '@/components/debts/DebtStrategy'
import { PaymentHistory } from '@/components/debts/PaymentHistory'
import { DebtModal } from '@/components/debts/DebtModal'
import { Loader2 } from 'lucide-react'
import { PageHeader } from "@/components/PageHeader"

import type { DebtAccount } from '@/types/debt.types'

export default function Debts() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const { data: debts, isLoading } = useDebts()
    // const [activeTab, setActiveTab] = useState('overview') // Unused for now as Tabs handles state

    // Filter active vs paid off debts could differ, but for now show active
    // Backend `listDebts` can filter. Component defaults to all? 
    // Let's assume listDebts returns all and we can filter here or use params hook.
    // For MVP, just showing all provided by hook.

    const activeDebts = debts?.data?.filter((d: DebtAccount) => d.is_active) || []
    const paidDebts = debts?.data?.filter((d: DebtAccount) => !d.is_active) || []

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <PageHeader
                title="Debt Management"
                description="Track, strategize, and payoff your debts."
            >
                <div className="flex items-center space-x-2">
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Debt
                    </Button>
                </div>
            </PageHeader>

            <DebtSummaryCard />

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">My Debts</TabsTrigger>
                    <TabsTrigger value="strategy">Payoff Strategy</TabsTrigger>
                    <TabsTrigger value="history">Payment History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {activeDebts.length === 0 && paidDebts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center border rounded-lg p-12 bg-muted/10 dashed">
                            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No debts tracked yet</h3>
                            <p className="text-muted-foreground mb-4 text-center max-w-sm">
                                Add your credit cards, loans, or other debts to start tracking your payoff journey.
                            </p>
                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                Add Your First Debt
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeDebts.map((debt: DebtAccount) => (
                                <DebtCard key={debt.debt_id} debt={debt} onViewDetails={() => { }} onRecordPayment={() => { }} />
                            ))}
                        </div>
                    )}

                    {paidDebts.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-xl font-semibold mb-4">Paid Off 🎉</h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-75">
                                {paidDebts.map((debt: DebtAccount) => (
                                    <DebtCard key={debt.debt_id} debt={debt} onViewDetails={() => { }} onRecordPayment={() => { }} />
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="strategy" className="space-y-4">
                    <DebtStrategy />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <PaymentHistory />
                </TabsContent>
            </Tabs>

            <DebtModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    )
}
