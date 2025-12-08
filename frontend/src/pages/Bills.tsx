import { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { BillCard } from '@/components/bills/BillCard'
import { BillModal } from '@/components/bills/BillModal'
import { UpcomingBillsWidget } from '@/components/bills/UpcomingBillsWidget'
import { useBills, useUpcomingBills, useOverdueBills } from '@/hooks/useBills'
import { SkeletonCard } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Calendar as CalendarIcon } from 'lucide-react'

export default function Bills() {
    const [showAddModal, setShowAddModal] = useState(false)
    const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('active')

    const { data: bills, isLoading: isLoadingBills } = useBills({
        is_active: filter === 'active' ? true : undefined,
        is_overdue: filter === 'overdue' ? true : undefined
    })

    const { data: upcomingBills, isLoading: isLoadingUpcoming } = useUpcomingBills(7)
    const { data: overdueBills } = useOverdueBills()

    const totalMonthly = bills?.reduce((sum, bill) => {
        if (bill.frequency === 'monthly') return sum + parseFloat(bill.amount)
        if (bill.frequency === 'weekly') return sum + (parseFloat(bill.amount) * 4)
        if (bill.frequency === 'biweekly') return sum + (parseFloat(bill.amount) * 2)
        if (bill.frequency === 'yearly') return sum + (parseFloat(bill.amount) / 12)
        return sum
    }, 0) || 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bills & Subscriptions</h1>
                    <p className="text-muted-foreground">
                        Manage your recurring payments and never miss a due date.
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Bill
                </Button>
            </div>

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
                                    : "Add your recurring bills  and subscriptions to track payments and never miss a due date."
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

                    {/* Future: Calendar Widget or similar could go here */}
                </div>
            </div>

            <BillModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
            />
        </div>
    )
}
