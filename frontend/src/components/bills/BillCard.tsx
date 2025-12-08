import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Calendar, CheckCircle, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Bill } from '@/types'
import { BillPaymentModal } from './BillPaymentModal'
import { BillModal } from './BillModal'
import { useDeleteBill } from '@/hooks/useBills'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BillCardProps {
    bill: Bill
}

export function BillCard({ bill }: BillCardProps) {
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const deleteBill = useDeleteBill()

    const handleDelete = async () => {
        try {
            await deleteBill.mutateAsync(bill.billId)
            setShowDeleteDialog(false)
        } catch (error) {
            // Error handled by hook
        }
    }

    const dueDate = parseISO(bill.nextDueDate)
    const daysUntil = bill.daysUntilDue

    let statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    let statusText = 'Upcoming'

    if (bill.isOverdue) {
        statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        statusText = `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`
    } else if (daysUntil <= 3) {
        statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        statusText = `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
    } else if (!bill.isActive) {
        statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
        statusText = 'Inactive'
    }

    return (
        <>
            <Card className="h-full">
                <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                style={{ backgroundColor: stringToColor(bill.name) }}
                            >
                                {bill.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg line-clamp-1">{bill.name}</h3>
                                <p className="text-sm text-muted-foreground">{bill.payee || bill.categoryName || 'Bill'}</p>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowPaymentModal(true)}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-2xl font-bold">${bill.amount}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                                <RefreshCw className="h-3 w-3" />
                                {bill.frequency}
                            </div>
                        </div>

                        <Badge variant="outline" className={`border-0 ${statusColor}`}>
                            {statusText}
                        </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Next Due
                            </span>
                            <span className={bill.isOverdue ? 'text-red-600 font-medium' : ''}>
                                {format(dueDate, 'MMM d, yyyy')}
                            </span>
                        </div>

                        {bill.isAutopay && (
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Autopay Enabled
                            </div>
                        )}

                        {bill.accountName && (
                            <div className="text-xs text-muted-foreground truncate">
                                Paid from: {bill.accountName}
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full mt-4"
                        variant={bill.isOverdue ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setShowPaymentModal(true)}
                    >
                        Mark Paid
                    </Button>
                </CardContent>
            </Card>

            <BillPaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                bill={bill}
            />

            <BillModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                bill={bill}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this bill and its future reminders. Historic payments will be kept.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}
