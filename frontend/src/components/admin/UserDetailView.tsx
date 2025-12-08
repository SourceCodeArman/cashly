import { useState, useEffect } from 'react'
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
    Trash2,
    Edit,
    Copy,
    Download,
    Send,
    UserCog,
    AlertTriangle,
    Calendar,
    DollarSign,
    TrendingUp,
    Users,
    BarChart3,
    MessageSquare,
    Settings,
    Key,
    Bell,
    FileText,
    MoreHorizontal,
    ChevronDown,
    Eye,
    EyeOff
} from 'lucide-react'
import { adminService } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface UserDetailViewProps {
    userId: string
    onClose: () => void
}

export function UserDetailView({ userId, onClose }: UserDetailViewProps) {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('overview')
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: ''
    })

    // Fetch user details
    const { data: user, isLoading, refetch } = useQuery({
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

    // Initialize edit data when user loads
    useEffect(() => {
        if (user) {
            setEditData({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber || ''
            })
        }
    }, [user])

    // Mutations
    const updateMutation = useMutation({
        mutationFn: (data: any) => adminService.updateUser(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
            toast.success('User updated successfully')
            setIsEditing(false)
        },
        onError: () => {
            toast.error('Failed to update user')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: () => adminService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
            toast.success('User deleted successfully')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to delete user')
        }
    })

    const sendEmailMutation = useMutation({
        mutationFn: (data: { subject: string; message: string }) => {
            // This would need to be implemented in adminService
            return Promise.resolve({ success: true })
        },
        onSuccess: () => {
            toast.success('Email sent successfully')
        },
        onError: () => {
            toast.error('Failed to send email')
        }
    })

    const handlePlanChange = (plan: string) => {
        updateMutation.mutate({ subscriptionTier: plan })
    }

    const handleStatusChange = (isActive: boolean) => {
        updateMutation.mutate({ isActive })
    }

    const handleSaveEdit = () => {
        updateMutation.mutate(editData)
    }

    const handleSendEmail = () => {
        // This would open an email dialog
        toast.info('Email functionality would be implemented here')
    }

    const handleExportData = () => {
        const userData = {
            user,
            accounts,
            transactions,
            goals,
            budgets
        }
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `user-${userId}-data.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('User data exported')
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard`)
    }

    const trialMutation = useMutation({
        mutationFn: (data: { trialEnd: string }) => adminService.manageUserTrial(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] })
            toast.success('Trial updated successfully')
        },
        onError: () => {
            toast.error('Failed to update trial')
        }
    })

    const handleTrialChange = (date: string) => {
        trialMutation.mutate({ trialEnd: date })
    }

    const endTrialNow = () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        handleTrialChange(yesterday.toISOString())
    }

    // Calculate user metrics
    const totalBalance = user ? (parseFloat(user.totalBalance) || 0) : 0
    const avgTransactionValue = transactions && transactions.length > 0
        ? transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) / transactions.length
        : 0
    const accountHealth = accounts ? accounts.filter(a => a.isActive).length / accounts.length * 100 : 100
    const goalProgress = goals && goals.length > 0
        ? goals.reduce((sum, g) => sum + (parseFloat(g.currentAmount) / parseFloat(g.targetAmount)), 0) / goals.length * 100
        : 0

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
        <div className="flex flex-col bg-background h-[95vh] max-h-[95vh]">
            {/* Enhanced Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                        {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
                            {user.isSuperuser && (
                                <Badge variant="secondary" className="px-2 py-1">
                                    <Shield className="mr-1 h-3 w-3" />
                                    Administrator
                                </Badge>
                            )}
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                                {user.isActive ? (
                                    <>
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <Ban className="mr-1 h-3 w-3" />
                                        Inactive
                                    </>
                                )}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1"
                                    onClick={() => copyToClipboard(user.email, 'Email')}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                    </div>
                            {user.phoneNumber && (
                                <>
                                    <span className="text-border">•</span>
                                    <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {user.phoneNumber}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 ml-1"
                                            onClick={() => copyToClipboard(user.phoneNumber || '', 'Phone')}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Quick Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4 mr-2" />
                                Actions
                                <ChevronDown className="h-3 w-3 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleSendEmail}>
                                <Send className="mr-2 h-4 w-4" />
                                Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportData}>
                                <Download className="mr-2 h-4 w-4" />
                                Export Data
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => copyToClipboard(user.id, 'User ID')}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy User ID
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => refetch()}>
                                <Activity className="mr-2 h-4 w-4" />
                                Refresh Data
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Fixed Tabs Navigation */}
            <div className="flex-shrink-0 border-b bg-background">
                <div className="flex space-x-1 p-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                        { id: 'overview', label: 'Overview', icon: FileText },
                        { id: 'accounts', label: `Accounts (${accounts?.length || 0})`, icon: CreditCard },
                        { id: 'transactions', label: `Transactions (${transactions?.length || 0})`, icon: Activity },
                        { id: 'goals', label: `Goals (${goals?.length || 0})`, icon: Target },
                        { id: 'budgets', label: `Budgets (${budgets?.length || 0})`, icon: PieChart },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-none border-b-2 transition-colors ${
                                activeTab === id
                                    ? 'text-primary border-primary bg-muted'
                                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 space-y-6">
                    {/* Edit Mode */}
                    {isEditing && (
                        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Edit className="h-4 w-4" />
                                    Edit User Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            value={editData.firstName}
                                            onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={editData.lastName}
                                            onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Phone Number</Label>
                                    <Input
                                        id="phoneNumber"
                                        value={editData.phoneNumber}
                                        onChange={(e) => setEditData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Tabs value={activeTab} className="w-full">
                        <TabsContent value="dashboard" className="mt-0 space-y-6">
                            {/* Key Metrics Overview */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                                                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalBalance)}</p>
                                            </div>
                                            <DollarSign className="h-8 w-8 text-green-600/60" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Accounts</p>
                                                <p className="text-2xl font-bold text-blue-600">{user.accountCount}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {accounts ? `${accounts.filter(a => a.isActive).length} active` : 'Loading...'}
                                                </p>
                                            </div>
                                            <CreditCard className="h-8 w-8 text-blue-600/60" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                                                <p className="text-2xl font-bold text-purple-600">{user.transactionCount}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Avg: {formatCurrency(avgTransactionValue)}
                                                </p>
                                            </div>
                                            <Activity className="h-8 w-8 text-purple-600/60" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
                                    <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Goals & Budgets</p>
                                                <p className="text-2xl font-bold text-orange-600">{user.goalCount + user.budgetCount}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {goals ? `${Math.round(goalProgress)}% goal progress` : 'Loading...'}
                                                </p>
                                            </div>
                                            <Target className="h-8 w-8 text-orange-600/60" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Account Management & Health */}
                            <div className="grid gap-6 lg:grid-cols-3">
                        {/* Account Controls */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserCog className="h-5 w-5" />
                                    Account Management
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Subscription Plan</Label>
                                    <Select
                                            value={user.subscriptionTier}
                                        onValueChange={handlePlanChange}
                                        disabled={user.isSuperuser}
                                    >
                                            <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="free">Free</SelectItem>
                                            <SelectItem value="pro">Pro</SelectItem>
                                            <SelectItem value="premium">Premium</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Account Status</Label>
                                        <div className="flex gap-2">
                                        {user.isActive ? (
                                            <Button
                                                variant="outline"
                                                    className="flex-1 text-destructive hover:text-destructive"
                                                onClick={() => handleStatusChange(false)}
                                                disabled={user.isSuperuser}
                                            >
                                                    <Ban className="mr-2 h-4 w-4" />
                                                    Suspend
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                    className="flex-1 text-green-600 hover:text-green-600"
                                                onClick={() => handleStatusChange(true)}
                                            >
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Activate
                                            </Button>
                                        )}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Trial Management</Label>
                                    <div className="flex gap-2">
                                        <DatePicker
                                            value={user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toISOString().split('T')[0] : undefined}
                                            onChange={handleTrialChange}
                                            placeholder="Trial end date"
                                            className="flex-1"
                                            disabled={user.isSuperuser}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={endTrialNow}
                                            disabled={user.isSuperuser || !user.subscriptionEndDate || new Date(user.subscriptionEndDate) <= new Date()}
                                        >
                                            End Now
                                        </Button>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                disabled={user.isSuperuser}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Account Permanently
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="flex items-center gap-2">
                                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                                    Delete User Account
                                                </AlertDialogTitle>
                                                <AlertDialogDescription className="space-y-2">
                                                    <p>This action cannot be undone. This will permanently delete:</p>
                                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                                        <li>The user account and all personal information</li>
                                                        <li>All linked accounts and transaction data</li>
                                                        <li>All goals, budgets, and financial planning data</li>
                                                        <li>Subscription and billing information</li>
                                                    </ul>
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => deleteMutation.mutate()}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Account
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Account Health */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Account Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Active Accounts</span>
                                        <span>{accounts ? `${accounts.filter(a => a.isActive).length}/${accounts.length}` : '...'}</span>
                            </div>
                                    <Progress value={accountHealth} className="h-2" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Goal Progress</span>
                                        <span>{goals ? `${Math.round(goalProgress)}%` : '...'}</span>
                                    </div>
                                    <Progress value={goalProgress} className="h-2" />
                                </div>

                                <div className="pt-2 border-t">
                                    <div className="text-sm text-muted-foreground">
                                        Member since {formatDate(user.createdAt)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                        </TabsContent>

                        <TabsContent value="overview" className="mt-0 space-y-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Profile Information</CardTitle>
                                    </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-muted-foreground mb-1">User ID</div>
                                                        <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                                            {user.id}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-4 w-4 p-0 ml-2"
                                                                onClick={() => copyToClipboard(user.id, 'User ID')}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                </div>
                            </div>
                                                    <div>
                                                        <div className="text-muted-foreground mb-1">Member Since</div>
                                                        <div>{formatDate(user.createdAt)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground mb-1">Last Login</div>
                                                        <div>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground mb-1">MFA Status</div>
                                                        <Badge variant={user.mfaEnabled ? "default" : "secondary"}>
                                                            {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                                                        </Badge>
                        </div>
                    </div>

                                                {user.stripeCustomerId && (
                                                    <div className="pt-4 border-t">
                                                        <div className="text-muted-foreground mb-1">Stripe Customer ID</div>
                                                        <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                                            {user.stripeCustomerId}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-4 w-4 p-0 ml-2"
                                                                onClick={() => copyToClipboard(user.stripeCustomerId || '', 'Stripe ID')}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Subscription Details</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-muted-foreground">Current Plan</span>
                                                        <Badge variant="outline" className="capitalize">
                                                            {user.subscriptionTier}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-muted-foreground">Status</span>
                                                        <Badge variant={user.subscriptionStatus === 'active' ? "default" : "secondary"}>
                                                            {user.subscriptionStatus || 'N/A'}
                                                        </Badge>
                                                    </div>
                                                    {user.subscriptionEndDate && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-muted-foreground">
                                                                {new Date(user.subscriptionEndDate) > new Date() ? 'Trial Ends' : 'Ended'}
                                                            </span>
                                                            <span className="text-sm">
                                                                {formatDate(user.subscriptionEndDate)}
                                                            </span>
                                                        </div>
                                                    )}
                                        </div>
                                            </CardContent>
                                        </Card>
                                </div>
                            </TabsContent>

                                <TabsContent value="accounts" className="mt-0">
                                <div className="space-y-4">
                                        {Array.isArray(accounts) && accounts.length > 0 ? (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {accounts.map((account) => (
                                                    <Card key={account.accountId} className="border-0 shadow-md">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <CreditCard className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{account.customName || account.institutionName}</div>
                                                                        <div className="text-xs text-muted-foreground capitalize">
                                                                            {account.accountType}
                                                                        </div>
                                                </div>
                                            </div>
                                                                <Badge variant={account.isActive ? "default" : "secondary"}>
                                                                    {account.isActive ? 'Active' : 'Inactive'}
                                                                </Badge>
                                                            </div>

                                                            <div className="flex items-end justify-between">
                                                                <div>
                                                                    <div className="text-xs text-muted-foreground mb-1">Balance</div>
                                                                    <div className="text-lg font-bold">
                                                                        {formatCurrency(parseFloat(account.balance))}
                                                                    </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {account.currency}
                                                </div>
                                            </div>
                                                                <div className="text-right">
                                                                    <div className="text-xs text-muted-foreground mb-1">Last Synced</div>
                                                                    <div className="text-xs">
                                                                        {account.lastSyncedAt ? formatDate(account.lastSyncedAt) : 'Never'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {account.errorMessage && (
                                                                <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                                                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                                                    {account.errorMessage}
                                        </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Accounts</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    This user hasn't connected any financial accounts yet.
                                                </p>
                                            </div>
                                    )}
                                </div>
                            </TabsContent>

                                <TabsContent value="transactions" className="mt-0">
                                    <div className="space-y-3">
                                        {Array.isArray(transactions) && transactions.length > 0 ? (
                                            transactions.map((transaction) => (
                                                <Card key={transaction.transactionId} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                                    parseFloat(transaction.amount) > 0
                                                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/20'
                                                                        : 'bg-red-100 text-red-600 dark:bg-red-900/20'
                                                    }`}>
                                                    {parseFloat(transaction.amount) > 0 ? '+' : '-'}
                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium truncate">
                                                                        {transaction.merchantName || transaction.description || 'Transaction'}
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {formatDate(transaction.date)} • {transaction.categoryName || 'Uncategorized'}
                                                                    </div>
                                                </div>
                                            </div>
                                                            <div className="text-right">
                                                                <div className={`font-bold text-lg ${
                                                                    parseFloat(transaction.amount) > 0 ? 'text-green-600' : 'text-foreground'
                                                }`}>
                                                {formatCurrency(parseFloat(transaction.amount))}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {transaction.accountName}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        ) : (
                                            <div className="text-center py-12">
                                                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Transactions</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    This user doesn't have any transactions yet.
                                                </p>
                                            </div>
                                    )}
                                </div>
                            </TabsContent>

                                <TabsContent value="goals" className="mt-0">
                                <div className="grid gap-4 md:grid-cols-2">
                                        {Array.isArray(goals) && goals.length > 0 ? (
                                            goals.map((goal) => {
                                                const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100
                                                const isOverGoal = progress > 100

                                                return (
                                                    <Card key={goal.goalId} className="border-0 shadow-md">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <div className="font-medium mb-1">{goal.name}</div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        Target: {formatCurrency(parseFloat(goal.targetAmount))}
                                                                    </div>
                                                                </div>
                                                                <Target className="h-5 w-5 text-muted-foreground" />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                                    <span>Current: {formatCurrency(parseFloat(goal.currentAmount))}</span>
                                                                    <span className="font-medium">{Math.round(progress)}%</span>
                                                </div>
                                                                <Progress
                                                                    value={Math.min(100, progress)}
                                                                    className={`h-3 ${isOverGoal ? '[&>div]:bg-orange-500' : ''}`}
                                                                />
                                                                {goal.deadline && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Deadline: {formatDate(goal.deadline)}
                                                                    </div>
                                                                )}
                                                </div>
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })
                                        ) : (
                                            <div className="col-span-full text-center py-12">
                                                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Goals</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    This user hasn't set up any savings goals yet.
                                                </p>
                                            </div>
                                    )}
                                </div>
                            </TabsContent>

                                <TabsContent value="budgets" className="mt-0">
                                <div className="grid gap-4 md:grid-cols-2">
                                        {Array.isArray(budgets) && budgets.length > 0 ? (
                                            budgets.map((budget) => {
                                                // For demo purposes, we'll use a placeholder spent amount
                                                // In a real implementation, this would come from the budget data
                                                const spent = Math.random() * parseFloat(budget.amount) * 0.8
                                                const remaining = parseFloat(budget.amount) - spent
                                                const percentage = (spent / parseFloat(budget.amount)) * 100
                                                const isOverBudget = percentage > 100

                                        return (
                                                    <Card key={budget.budgetId} className="border-0 shadow-md">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <div className="font-medium mb-1">{budget.categoryName}</div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        Budget: {formatCurrency(parseFloat(budget.amount))}
                                                                    </div>
                                                                </div>
                                                                <PieChart className="h-5 w-5 text-muted-foreground" />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                                    <span>Spent: {formatCurrency(spent)}</span>
                                                                    <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-green-600'}`}>
                                                                        {remaining > 0 ? `${formatCurrency(remaining)} left` : formatCurrency(Math.abs(remaining)) + ' over'}
                                                                    </span>
                                                    </div>
                                                                <Progress
                                                                    value={Math.min(100, percentage)}
                                                                    className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                                                        />
                                                    </div>
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })
                                        ) : (
                                            <div className="col-span-full text-center py-12">
                                                <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Budgets</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    This user hasn't created any budgets yet.
                                                </p>
                                            </div>
                                    )}
                                </div>
                            </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    )
}
