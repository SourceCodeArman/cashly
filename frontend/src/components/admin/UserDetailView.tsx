import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    X,
    Mail,
    Phone,
    CreditCard,
    Shield,
    Activity,
    Target,
    PieChart,
    CheckCircle2,
    Ban,
    Trash2
} from 'lucide-react'
import { adminService } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface UserDetailViewProps {
    userId: string
    onClose: () => void
}

export function UserDetailView({ userId, onClose }: UserDetailViewProps) {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('overview')

    // Fetch user details
    const { data: user, isLoading } = useQuery({
        queryKey: ['admin', 'user', userId],
        queryFn: () => adminService.getUserDetails(userId),
    })

    // Fetch related data
    const { data: accounts } = useQuery({
        queryKey: ['admin', 'user', userId, 'accounts'],
        queryFn: () => adminService.getUserAccounts(userId),
        enabled: !!user,
    })

    const { data: transactions } = useQuery({
        queryKey: ['admin', 'user', userId, 'transactions'],
        queryFn: () => adminService.getUserTransactions(userId),
        enabled: !!user,
    })

    const { data: goals } = useQuery({
        queryKey: ['admin', 'user', userId, 'goals'],
        queryFn: () => adminService.getUserGoals(userId),
        enabled: !!user,
    })

    const { data: budgets } = useQuery({
        queryKey: ['admin', 'user', userId, 'budgets'],
        queryFn: () => adminService.getUserBudgets(userId),
        enabled: !!user,
    })

    // Mutations
    const updateMutation = useMutation({
        mutationFn: (data: any) => adminService.updateUser(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
            toast.success('User updated successfully')
        },
        onError: () => {
            toast.error('Failed to update user')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: () => adminService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
            toast.success('User deleted successfully')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to delete user')
        }
    })

    const handlePlanChange = (plan: string) => {
        updateMutation.mutate({ subscriptionTier: plan })
    }

    const handleStatusChange = (isActive: boolean) => {
        updateMutation.mutate({ isActive })
    }

    if (isLoading || !user) {
        return (
            <div className="h-full p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-background max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" /> {user.email}
                            {user.phoneNumber && (
                                <>
                                    <span className="text-border">•</span>
                                    <Phone className="h-3 w-3" /> {user.phoneNumber}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {user.isSuperuser && (
                        <Badge variant="secondary" className="h-6">
                            <Shield className="mr-1 h-3 w-3" /> Admin
                        </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 space-y-8">
                    {/* Quick Actions & Status */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Shield className="h-4 w-4" /> Account Status
                            </h3>
                            <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Subscription Plan</span>
                                    <Select
                                        defaultValue={user.subscriptionTier}
                                        onValueChange={handlePlanChange}
                                        disabled={user.isSuperuser}
                                    >
                                        <SelectTrigger className="w-[140px] h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="free">Free</SelectItem>
                                            <SelectItem value="pro">Pro</SelectItem>
                                            <SelectItem value="premium">Premium</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Account Access</span>
                                    <div className="flex items-center gap-2">
                                        {user.isActive ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-destructive hover:text-destructive"
                                                onClick={() => handleStatusChange(false)}
                                                disabled={user.isSuperuser}
                                            >
                                                <Ban className="mr-2 h-3 w-3" />
                                                Ban User
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-success hover:text-success"
                                                onClick={() => handleStatusChange(true)}
                                            >
                                                <CheckCircle2 className="mr-2 h-3 w-3" />
                                                Unban User
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-destructive">Danger Zone</span>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="h-8"
                                                disabled={user.isSuperuser}
                                            >
                                                <Trash2 className="mr-2 h-3 w-3" />
                                                Delete Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the user account
                                                    and remove all their data from our servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => deleteMutation.mutate()}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete Account
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Usage Overview
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg border border-border bg-card">
                                    <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
                                    <div className="text-2xl font-bold">{formatCurrency(parseFloat(user.totalBalance))}</div>
                                </div>
                                <div className="p-4 rounded-lg border border-border bg-card">
                                    <div className="text-sm text-muted-foreground mb-1">Accounts</div>
                                    <div className="text-2xl font-bold">{user.accountCount}</div>
                                </div>
                                <div className="p-4 rounded-lg border border-border bg-card">
                                    <div className="text-sm text-muted-foreground mb-1">Transactions</div>
                                    <div className="text-2xl font-bold">{user.transactionCount}</div>
                                </div>
                                <div className="p-4 rounded-lg border border-border bg-card">
                                    <div className="text-sm text-muted-foreground mb-1">Goals & Budgets</div>
                                    <div className="text-2xl font-bold">{user.goalCount + user.budgetCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Data Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent">
                            <TabsTrigger
                                value="overview"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="accounts"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                                Accounts ({accounts?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger
                                value="transactions"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                                Transactions ({transactions?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger
                                value="goals"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                                Goals ({goals?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger
                                value="budgets"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                            >
                                Budgets ({budgets?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="overview" className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">User Details</h4>
                                        <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                                            <div className="text-muted-foreground">User ID</div>
                                            <div className="font-mono text-xs">{user.id}</div>
                                            <div className="text-muted-foreground">Joined</div>
                                            <div>{formatDate(user.createdAt)}</div>
                                            <div className="text-muted-foreground">Last Login</div>
                                            <div>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</div>
                                            <div className="text-muted-foreground">Stripe ID</div>
                                            <div className="font-mono text-xs">{user.stripeCustomerId || 'N/A'}</div>
                                            <div className="text-muted-foreground">MFA Enabled</div>
                                            <div>{user.mfaEnabled ? 'Yes' : 'No'}</div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="accounts">
                                <div className="space-y-4">
                                    {Array.isArray(accounts) && accounts.map((account) => (
                                        <div key={account.accountId} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <CreditCard className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{account.customName || account.institutionName}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">{account.accountType}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">{formatCurrency(parseFloat(account.balance))}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {account.currency}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!Array.isArray(accounts) || accounts.length === 0) && (
                                        <div className="text-center py-8 text-muted-foreground">No accounts found</div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="transactions">
                                <div className="space-y-2">
                                    {Array.isArray(transactions) && transactions.map((transaction) => (
                                        <div key={transaction.transactionId} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${parseFloat(transaction.amount) > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                                                    }`}>
                                                    {parseFloat(transaction.amount) > 0 ? '+' : '-'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{transaction.description || 'Transaction'}</div>
                                                    <div className="text-xs text-muted-foreground">{formatDate(transaction.date)}</div>
                                                </div>
                                            </div>
                                            <div className={`font-medium ${parseFloat(transaction.amount) > 0 ? 'text-success' : 'text-foreground'
                                                }`}>
                                                {formatCurrency(parseFloat(transaction.amount))}
                                            </div>
                                        </div>
                                    ))}
                                    {(!Array.isArray(transactions) || transactions.length === 0) && (
                                        <div className="text-center py-8 text-muted-foreground">No transactions found</div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="goals">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {Array.isArray(goals) && goals.map((goal) => (
                                        <div key={goal.goalId} className="p-4 rounded-lg border border-border bg-card">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-medium">{goal.name}</div>
                                                <Target className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>{formatCurrency(parseFloat(goal.currentAmount))}</span>
                                                    <span className="text-muted-foreground">of {formatCurrency(parseFloat(goal.targetAmount))}</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                                    <div
                                                        className={`h-full ${parseFloat(goal.currentAmount) > parseFloat(goal.targetAmount) ? 'bg-destructive' : 'bg-primary'}`}
                                                        style={{ width: `${Math.min(100, (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!Array.isArray(goals) || goals.length === 0) && (
                                        <div className="col-span-2 text-center py-8 text-muted-foreground">No goals found</div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="budgets">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {Array.isArray(budgets) && budgets.map((budget) => {
                                        // Calculate spent percentage based on amount (since we don't have spent in AdminBudget yet)
                                        // For now, we'll assume 0 spent or fetch it if available in future
                                        const spent = 0
                                        const amount = parseFloat(budget.amount)
                                        const percentage = 0

                                        return (
                                            <div key={budget.budgetId} className="p-4 rounded-lg border border-border bg-card">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="font-medium">{budget.categoryName}</div>
                                                    <PieChart className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span>{formatCurrency(spent)}</span>
                                                        <span className="text-muted-foreground">of {formatCurrency(amount)}</span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                                        <div
                                                            className={`h-full ${spent > amount ? 'bg-destructive' : 'bg-primary'}`}
                                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {(!Array.isArray(budgets) || budgets.length === 0) && (
                                        <div className="col-span-2 text-center py-8 text-muted-foreground">No budgets found</div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    )
}
