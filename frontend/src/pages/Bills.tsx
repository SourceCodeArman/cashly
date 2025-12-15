import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Filter, Play, Loader2, Repeat } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BillCard } from '@/components/bills/BillCard'
import { BillModal } from '@/components/bills/BillModal'
import { UpcomingBillsWidget } from '@/components/bills/UpcomingBillsWidget'
import { RecurringGroupCard } from '@/components/RecurringGroupCard'
import { useBills, useUpcomingBills, useOverdueBills } from '@/hooks/useBills'
import { useTransactions } from '@/hooks/useTransactions'
import { transactionService } from '@/services/transactionService'
import { SkeletonCard } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Calendar as CalendarIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { PageHeader } from "@/components/PageHeader"

export default function Bills() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [showAddModal, setShowAddModal] = useState(false)
    const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('active')
    const [runningDetection, setRunningDetection] = useState(false)
    const queryClient = useQueryClient()

    // Get active tab from URL or default to 'manual'
    const activeTab = searchParams.get('tab') || 'manual'

    const setActiveTab = (tab: string) => {
        setSearchParams({ tab })
    }

    // Bills data
    const { data: bills, isLoading: isLoadingBills } = useBills({
        is_active: filter === 'active' ? true : undefined,
        is_overdue: filter === 'overdue' ? true : undefined
    })
    const { data: upcomingBills, isLoading: isLoadingUpcoming } = useUpcomingBills(7)
    const { data: overdueBills } = useOverdueBills()

    // Recurring transactions data
    const { data: transactionsData, isLoading: isLoadingTransactions } = useTransactions({
        page_size: 200,
    })

    // Detection mutation
    const detectMutation = useMutation({
        mutationFn: () => transactionService.detectRecurring(3, 180),
        onSuccess: (data) => {
            toast.success(
                `Detected ${data.data?.detected?.length || 0} recurring groups, marked ${data.data?.updated_count || 0} transactions`
            )
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to detect recurring transactions')
        },
    })

    const runDetection = async () => {
        setRunningDetection(true)
        try {
            await detectMutation.mutateAsync()
        } finally {
            setRunningDetection(false)
        }
    }

    const markNonRecurringMutation = useMutation({
        mutationFn: (transactionIds: string[]) => transactionService.markNonRecurring(transactionIds),
        onSuccess: (data) => {
            toast.success(data.message || `Marked ${data.data?.updated_count} transactions as non-recurring`)
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to mark as non-recurring')
        },
    })

    // Extract and process transactions
    const allTransactions = useMemo(() => {
        if (!transactionsData) return []
        if ('results' in transactionsData && Array.isArray(transactionsData.results)) {
            return transactionsData.results
        }
        if (Array.isArray(transactionsData)) {
            return transactionsData
        }
        return []
    }, [transactionsData])

    const recurringTransactions = useMemo(
        () => allTransactions.filter((t) => t.isRecurring),
        [allTransactions]
    )

    // Group recurring transactions by merchant
    const groupedByMerchant = useMemo(() => {
        const groups = new Map<string, typeof recurringTransactions>()

        recurringTransactions.forEach((transaction) => {
            const merchant = transaction.merchantName || 'Unknown'
            if (!groups.has(merchant)) {
                groups.set(merchant, [])
            }
            groups.get(merchant)!.push(transaction)
        })

        return Array.from(groups.entries())
            .map(([merchant, transactions]) => {
                const sorted = transactions.sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                )

                // Calculate average interval
                let intervalDays = 0
                if (sorted.length > 1) {
                    const diffs = []
                    for (let i = 0; i < sorted.length - 1; i++) {
                        const d1 = new Date(sorted[i].date).getTime()
                        const d2 = new Date(sorted[i + 1].date).getTime()
                        diffs.push(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24))
                    }
                    intervalDays = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
                }

                return {
                    merchant,
                    transactions: sorted,
                    count: transactions.length,
                    averageAmount:
                        transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) /
                        transactions.length,
                    totalAmount: transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0),
                    category: transactions[0].category,
                    intervalDays
                }
            })
            .sort((a, b) => b.count - a.count)
    }, [recurringTransactions])

    // Calculate bills stats
    const totalMonthly = bills?.reduce((sum, bill) => {
        if (bill.frequency === 'monthly') return sum + parseFloat(bill.amount)
        if (bill.frequency === 'weekly') return sum + (parseFloat(bill.amount) * 4)
        if (bill.frequency === 'biweekly') return sum + (parseFloat(bill.amount) * 2)
        if (bill.frequency === 'yearly') return sum + (parseFloat(bill.amount) / 12)
        return sum
    }, 0) || 0

    // Calculate recurring transaction stats
    const recurringStats = useMemo(() => {
        const totalRecurring = recurringTransactions.length
        const uniqueMerchants = groupedByMerchant.length
        const totalSpent = recurringTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.amount) < 0 ? Math.abs(parseFloat(t.amount)) : 0),
            0
        )

        return {
            totalRecurring,
            uniqueMerchants,
            totalSpent,
        }
    }, [recurringTransactions, groupedByMerchant])

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* Header */}
            <PageHeader
                title="Bills & Recurring Payments"
                description="Manage your bills, subscriptions, and automatically detected recurring payments."
            >
                {activeTab === 'manual' && (
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Bill
                    </Button>
                )}
                {activeTab === 'recurring' && (
                    <Button onClick={runDetection} disabled={runningDetection}>
                        {runningDetection ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Detecting...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4 mr-2" />
                                Run Detection
                            </>
                        )}
                    </Button>
                )}
            </PageHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="manual">Manual Bills</TabsTrigger>
                    <TabsTrigger value="recurring">Detected Recurring</TabsTrigger>
                </TabsList>

                {/* Manual Bills Tab */}
                <TabsContent value="manual" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="bg-card rounded-xl border p-4 shadow-sm">
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Total Monthly</div>
                                    <div className="text-2xl font-bold">${totalMonthly.toFixed(2)}</div>
                                </div>
                                <div className="bg-card rounded-xl border p-4 shadow-sm">
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Active Bills</div>
                                    <div className="text-2xl font-bold">{bills?.length || 0}</div>
                                </div>
                                <div className="bg-card rounded-xl border p-4 shadow-sm">
                                    <div className="text-sm font-medium text-muted-foreground mb-1">Overdue</div>
                                    <div className={`text-2xl font-bold ${(overdueBills?.length || 0) > 0 ? 'text-red-500' : ''}`}>
                                        {overdueBills?.length || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">Your Bills</h2>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Filter" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active Only</SelectItem>
                                            <SelectItem value="all">All Bills</SelectItem>
                                            <SelectItem value="overdue">Overdue Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* List */}
                            {isLoadingBills ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            ) : bills?.length === 0 ? (
                                <EmptyState
                                    icon={CalendarIcon}
                                    title={filter === 'overdue' ? 'No overdue bills' : 'No bills yet'}
                                    description={
                                        filter === 'overdue'
                                            ? "Great job! You have no overdue bills."
                                            : "Add your recurring bills and subscriptions to track payments and never miss a due date."
                                    }
                                    actionLabel={filter !== 'overdue' ? 'Add Bill' : undefined}
                                    onAction={filter !== 'overdue' ? () => setShowAddModal(true) : undefined}
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {bills?.map((bill) => (
                                        <BillCard key={bill.billId} bill={bill} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <UpcomingBillsWidget bills={upcomingBills || []} isLoading={isLoadingUpcoming} />
                        </div>
                    </div>
                </TabsContent>

                {/* Detected Recurring Tab */}
                <TabsContent value="recurring" className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Recurring Transactions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingTransactions ? (
                                    <Skeleton className="h-8 w-16" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="text-2xl font-bold">{recurringStats.totalRecurring}</div>
                                        <Badge variant="secondary">
                                            <Repeat className="h-3 w-3 mr-1" />
                                            Detected
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Unique Merchants</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingTransactions ? (
                                    <Skeleton className="h-8 w-16" />
                                ) : (
                                    <div className="text-2xl font-bold">{recurringStats.uniqueMerchants}</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Recurring Spending</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingTransactions ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div className="text-2xl font-bold text-destructive">
                                        {formatCurrency(recurringStats.totalSpent)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Grouped Transactions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recurring Merchants</CardTitle>
                            <CardDescription>
                                Grouped by merchant ({groupedByMerchant.length} merchants)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingTransactions ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 w-full" />
                                    ))}
                                </div>
                            ) : groupedByMerchant.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Repeat className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold mb-2">No Recurring Transactions</h3>
                                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                        Click "Run Detection" to automatically identify recurring transactions in your
                                        history
                                    </p>
                                    <Button onClick={runDetection} disabled={runningDetection}>
                                        <Play className="h-4 w-4 mr-2" />
                                        Run Detection Now
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {groupedByMerchant.map((group) => {
                                        const avgAmount = group.averageAmount

                                        return (
                                            <RecurringGroupCard
                                                key={group.merchant}
                                                merchantName={group.merchant}
                                                amount={Number(avgAmount)}
                                                count={group.count}
                                                category={group.category}
                                                transactions={group.transactions}
                                                intervalDays={group.intervalDays}
                                                onMarkNonRecurring={() => {
                                                    const transactionIds = group.transactions.map(t => t.id)
                                                    markNonRecurringMutation.mutate(transactionIds)
                                                }}
                                                isProcessing={markNonRecurringMutation.isPending}
                                            />
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <BillModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
            />
        </div>
    )
}
