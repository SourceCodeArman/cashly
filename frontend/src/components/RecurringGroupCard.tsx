import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import {
    ChevronDown,
    History,
    TrendingUp
} from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils"
// Import type locally if not exported
import type { Transaction } from "@/types"

interface RecurringGroupCardProps {
    merchantName: string
    amount: number
    count: number
    periodType?: string
    intervalDays?: number
    category?: {
        name: string
        color?: string
    } | string
    accountName?: string
    confidence?: {
        score: number
        level: 'possible' | 'confirmed'
    }
    dates?: {
        first: string
        last: string
    }
    transactions?: Transaction[]
    onMarkNonRecurring: () => void
    isProcessing?: boolean
    defaultOpen?: boolean
}

export function RecurringGroupCard({
    merchantName,
    amount,
    count,
    periodType,
    intervalDays,
    category,
    accountName,
    confidence,
    dates,
    transactions,
    onMarkNonRecurring,
    isProcessing = false,
    defaultOpen = false
}: RecurringGroupCardProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    // Normalize category for display
    const categoryName = typeof category === 'string' ? category : category?.name
    const categoryColor = typeof category === 'object' ? category?.color : undefined

    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    return (
        <>
            <motion.div
                initial={false}
                animate={{
                    backgroundColor: isOpen ? "rgba(var(--background), 0.8)" : "rgba(var(--background), 0.5)",
                    borderColor: isOpen ? "rgba(var(--primary), 0.2)" : "rgba(var(--border), 0.6)"
                }}
                className={cn(
                    "group relative overflow-hidden rounded-xl transition-all duration-300 bg-card",
                    isOpen ? "shadow-xl ring-1 ring-primary/5" : "shadow hover:shadow-md"
                )}
            >
                {/* Header / Trigger Area */}
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative flex items-center justify-between p-4 cursor-pointer select-none"
                >
                    {/* Left: Merchant Info */}
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full border bg-background shadow-sm transition-transform duration-300",
                            "group-hover:scale-105 group-hover:shadow-md"
                        )}>
                            {/* Fallback Icon based on name/category could go here */}
                            <div className="text-lg font-bold text-primary/80">
                                {merchantName.substring(0, 1).toUpperCase()}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg leading-none tracking-tight text-foreground">
                                    {merchantName}
                                </h3>
                                {confidence?.level === 'possible' && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-600 border-amber-200 bg-amber-50">
                                        Possible
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {categoryName && (
                                    <span className="flex items-center gap-1.5">
                                        <span
                                            className="inline-block h-2 w-2 rounded-full"
                                            style={{ backgroundColor: categoryColor || 'hsl(var(--muted-foreground))' }}
                                        />
                                        {categoryName}
                                    </span>
                                )}
                                <span className="text-border">|</span>
                                <span>{accountName || 'Checking'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Amount & Toggle */}
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-xl font-bold tracking-tight">
                                {formatCurrency(Math.abs(amount))}
                            </div>
                            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                {periodType && <span className="capitalize">{periodType}</span>}
                                {!periodType && intervalDays && <span>~{intervalDays} days</span>}
                                <span>•</span>
                                <span>{count}x</span>
                            </div>
                        </div>

                        <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 transition-transform duration-300",
                            isOpen && "rotate-180 bg-primary/10 text-primary"
                        )}>
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <div className="border-t bg-muted/20 px-4 pb-4 pt-0">
                                <div className="grid gap-6 pt-6 md:grid-cols-2">

                                    {/* Stats Grid */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                            Insight
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg border bg-background/50 p-3 shadow-sm">
                                                <span className="text-xs text-muted-foreground">Total Spent</span>
                                                <div className="mt-1 text-lg font-semibold">
                                                    {formatCurrency(Math.abs(amount * count))}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border bg-background/50 p-3 shadow-sm">
                                                <span className="text-xs text-muted-foreground">Avg Interval</span>
                                                <div className="mt-1 text-lg font-semibold">
                                                    {intervalDays ? `${intervalDays} days` : 'N/A'}
                                                </div>
                                            </div>
                                            {confidence && (
                                                <div className="col-span-2 rounded-lg border bg-background/50 p-3 shadow-sm flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Detection Confidence</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-24 rounded-full bg-secondary overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary transition-all"
                                                                style={{ width: `${(confidence.score * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-medium">{(confidence.score * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* History List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <History className="h-4 w-4 text-primary" />
                                                Recent Activity
                                            </div>
                                            {dates && (
                                                <span className="text-xs text-muted-foreground font-normal">
                                                    Since {format(new Date(dates.first), 'MMM yyyy')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="rounded-lg border bg-background/50 shadow-sm overflow-hidden">
                                            {(transactions && transactions.length > 0) ? (
                                                <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                                                    {transactions.slice(0, 10).map((tx, i) => (
                                                        <div
                                                            key={tx.id || i}
                                                            className="flex items-center justify-between border-b last:border-0 px-3 py-2.5 text-sm hover:bg-muted/30 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-16 text-xs text-muted-foreground font-mono">
                                                                    {format(new Date(tx.date), 'MMM d')}
                                                                </div>
                                                                <div className="truncate max-w-[120px] text-foreground/80 text-xs">
                                                                    {tx.merchantName || 'Transaction'}
                                                                </div>
                                                            </div>
                                                            <div className="font-medium text-foreground">
                                                                {formatCurrency(Math.abs(parseFloat(tx.amount)))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-4 text-center text-xs text-muted-foreground">
                                                    No history available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-dashed">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.location.href = `/transactions?search=${encodeURIComponent(merchantName)}`;
                                        }}
                                    >
                                        View Full Details
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowConfirmDialog(true)
                                        }}
                                        disabled={isProcessing}
                                        className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-transparent hover:shadow-sm transition-all"
                                    >
                                        {isProcessing ? 'Processing...' : 'Mark as Non-Recurring'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mark as Non-Recurring</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to stop tracking <span className="font-medium text-foreground">{merchantName}</span> as a recurring subscription?
                            This will remove the recurring flag from all associated transactions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.stopPropagation()
                                onMarkNonRecurring()
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Stop Tracking
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
