import { useState } from 'react'
import {
    Search,
    MoreHorizontal,
    Shield,
    UserX,
    UserCheck,
    CreditCard,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Filter,
    CheckSquare,
    Square,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Download,
    Mail,
    Ban,
    CheckCircle2,
    Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { AdminUserListItem } from '@/types'

type SortField = 'createdAt' | 'lastLogin' | 'totalBalance' | 'accountCount' | 'transactionCount'
type SortDirection = 'asc' | 'desc'

interface UserManagementTableProps {
    users: AdminUserListItem[]
    isLoading: boolean
    totalCount: number
    page: number
    pageSize: number
    search: string
    onPageChange: (page: number) => void
    onSearchChange: (search: string) => void
    onViewDetails: (userId: string) => void
    onDeleteUser: (userId: string) => void
    onBulkDelete?: (userIds: string[]) => void
}

export function UserManagementTable({
    users,
    isLoading,
    totalCount,
    page,
    pageSize,
    search,
    onPageChange,
    onSearchChange,
    onViewDetails,
    onDeleteUser,
    onBulkDelete,
}: UserManagementTableProps) {
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [visibleColumns, setVisibleColumns] = useState({
        status: true,
        subscription: true,
        stats: true,
        joined: true,
        actions: true,
    })

    const totalPages = Math.ceil(totalCount / pageSize)

    const handleSelectUser = (userId: string, checked: boolean) => {
        const newSelected = new Set(selectedUsers)
        if (checked) {
            newSelected.add(userId)
        } else {
            newSelected.delete(userId)
        }
        setSelectedUsers(newSelected)
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUsers(new Set(users.map(u => u.id)))
        } else {
            setSelectedUsers(new Set())
        }
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />
        return sortDirection === 'asc' ?
            <ArrowUp className="h-3 w-3" /> :
            <ArrowDown className="h-3 w-3" />
    }

    const sortedUsers = [...users].sort((a, b) => {
        let aValue: any = a[sortField]
        let bValue: any = b[sortField]

        if (sortField === 'createdAt' || sortField === 'lastLogin') {
            aValue = new Date(aValue || 0).getTime()
            bValue = new Date(bValue || 0).getTime()
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    const handleBulkDelete = () => {
        if (onBulkDelete && selectedUsers.size > 0) {
            onBulkDelete(Array.from(selectedUsers))
            setSelectedUsers(new Set())
        }
    }

    const handleExportSelected = () => {
        const selectedUserData = users.filter(u => selectedUsers.has(u.id))
        const csvContent = [
            ['ID', 'Name', 'Email', 'Status', 'Subscription', 'Accounts', 'Transactions', 'Balance', 'Joined'].join(','),
            ...selectedUserData.map(u => [
                u.id,
                `"${u.firstName} ${u.lastName}"`,
                u.email,
                u.isActive ? 'Active' : 'Inactive',
                u.subscriptionTier,
                u.accountCount,
                u.transactionCount,
                u.totalBalance,
                u.createdAt
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exported ${selectedUsers.size} users to CSV`)
    }

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                    <div>
                            <CardTitle className="text-xl">Users</CardTitle>
                        <CardDescription>
                                {selectedUsers.size > 0
                                    ? `${selectedUsers.size} of ${totalCount.toLocaleString()} users selected`
                                    : `${totalCount.toLocaleString()} total users`
                                }
                        </CardDescription>
                        </div>

                        {/* Bulk Actions */}
                        {selectedUsers.size > 0 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportSelected}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>

                                {onBulkDelete && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Selected ({selectedUsers.size})
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Users</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}?
                                                    This action cannot be undone and will permanently remove all user data.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleBulkDelete}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete Users
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedUsers(new Set())}
                                >
                                    Clear Selection
                        </Button>
                            </div>
                        )}
                    </div>

                    {/* Column Visibility */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.status}
                                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, status: checked }))}
                            >
                                Status
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.subscription}
                                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, subscription: checked }))}
                            >
                                Subscription
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.stats}
                                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, stats: checked }))}
                            >
                                Stats
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.joined}
                                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, joined: checked }))}
                            >
                                Joined
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.actions}
                                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, actions: checked }))}
                            >
                                Actions
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-md border border-border overflow-hidden">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="bg-muted/50">
                                <tr className="border-b border-border">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                                                <Checkbox
                                                    checked={selectedUsers.size === users.length && users.length > 0}
                                                    onCheckedChange={handleSelectAll}
                                                    aria-label="Select all users"
                                                />
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort('createdAt')}
                                            className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            User
                                            {getSortIcon('createdAt')}
                                        </Button>
                                    </th>
                                    {visibleColumns.status && (
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    )}
                                    {visibleColumns.subscription && (
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Subscription
                                    </th>
                                    )}
                                    {visibleColumns.stats && (
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSort('accountCount')}
                                                className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
                                            >
                                        Stats
                                                {getSortIcon('accountCount')}
                                            </Button>
                                    </th>
                                    )}
                                    {visibleColumns.joined && (
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSort('createdAt')}
                                                className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
                                            >
                                        Joined
                                                {getSortIcon('createdAt')}
                                            </Button>
                                    </th>
                                    )}
                                    {visibleColumns.actions && (
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                        Actions
                                    </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-border">
                                            <td className="p-4"><Skeleton className="h-4 w-4" /></td>
                                            <td className="p-4"><Skeleton className="h-10 w-40" /></td>
                                            {visibleColumns.status && <td className="p-4"><Skeleton className="h-6 w-20" /></td>}
                                            {visibleColumns.subscription && <td className="p-4"><Skeleton className="h-6 w-24" /></td>}
                                            {visibleColumns.stats && <td className="p-4"><Skeleton className="h-8 w-32" /></td>}
                                            {visibleColumns.joined && <td className="p-4"><Skeleton className="h-4 w-24" /></td>}
                                            {visibleColumns.actions && <td className="p-4"><Skeleton className="h-8 w-8 ml-auto" /></td>}
                                        </tr>
                                    ))
                                ) : sortedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="p-8 text-center text-muted-foreground">
                                            No users found matching your criteria
                                        </td>
                                    </tr>
                                ) : (
                                    sortedUsers.map((user) => {
                                        const isSelected = selectedUsers.has(user.id)
                                        return (
                                        <tr
                                            key={user.id}
                                                className={`border-b border-border transition-colors hover:bg-muted/50 ${
                                                    isSelected ? 'bg-primary/5 border-primary/20' : ''
                                                }`}
                                        >
                                            <td className="p-4 align-middle">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                                                        aria-label={`Select ${user.firstName} ${user.lastName}`}
                                                    />
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                                            {user.firstName[0]}{user.lastName[0]}
                                                        </div>
                                                <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {user.firstName} {user.lastName}
                                                    </span>
                                                    {user.isSuperuser && (
                                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                                            <Shield className="mr-1 h-3 w-3" />
                                                            Admin
                                                        </Badge>
                                                    )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {user.email}
                                                            </span>
                                                        </div>
                                                </div>
                                            </td>
                                                {visibleColumns.status && (
                                            <td className="p-4 align-middle">
                                                <Badge
                                                    variant={user.isActive ? 'default' : 'destructive'}
                                                    className="capitalize"
                                                >
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
                                            </td>
                                                )}
                                                {visibleColumns.subscription && (
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit capitalize">
                                                        {user.subscriptionTier}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {user.subscriptionStatus}
                                                    </span>
                                                </div>
                                            </td>
                                                )}
                                                {visibleColumns.stats && (
                                            <td className="p-4 align-middle">
                                                <div className="text-xs space-y-1">
                                                            <div className="flex items-center gap-1">
                                                                <CreditCard className="h-3 w-3 text-muted-foreground" />
                                                                {user.accountCount} accounts
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Activity className="h-3 w-3 text-muted-foreground" />
                                                                {user.transactionCount} txns
                                                            </div>
                                                            <div className="font-medium text-green-600">
                                                                {formatCurrency(parseFloat(user.totalBalance) || 0)}
                                                    </div>
                                                </div>
                                            </td>
                                                )}
                                                {visibleColumns.joined && (
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col">
                                                            <span className="text-sm">{formatDate(user.createdAt)}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                                Last: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                                                    </span>
                                                </div>
                                            </td>
                                                )}
                                                {visibleColumns.actions && (
                                            <td className="p-4 align-middle text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                                                            <CreditCard className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                                <DropdownMenuItem>
                                                                    <Mail className="mr-2 h-4 w-4" />
                                                                    Send Email
                                                                </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive"
                                                                    onClick={() => onDeleteUser(user.id)}
                                                                >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                                )}
                                        </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Enhanced Pagination */}
                <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/20">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                            Showing {users.length > 0 ? ((page - 1) * pageSize) + 1 : 0} to{' '}
                            {Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} users
                        </span>
                        {selectedUsers.size > 0 && (
                            <Badge variant="secondary">
                                {selectedUsers.size} selected
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Page size selector */}
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => {
                                // This would need to be passed up to parent component
                                console.log('Page size change:', value)
                            }}
                        >
                            <SelectTrigger className="w-20 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1 || isLoading}
                                className="h-8 px-3"
                        >
                            <ChevronLeft className="h-4 w-4" />
                                Prev
                            </Button>

                            {/* Page numbers */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                                    if (pageNum > totalPages) return null
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => onPageChange(pageNum)}
                                            disabled={isLoading}
                                            className="h-8 w-8 p-0"
                                        >
                                            {pageNum}
                        </Button>
                                    )
                                })}
                            </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages || isLoading}
                                className="h-8 px-3"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
