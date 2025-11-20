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
    Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AdminUserListItem } from '@/types'

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
}: UserManagementTableProps) {
    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <Card className="border-border shadow-soft">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>
                            Manage user accounts, subscriptions, and permissions
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-border">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        User
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Subscription
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Stats
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Joined
                                    </th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-border">
                                            <td className="p-4"><Skeleton className="h-10 w-40" /></td>
                                            <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                                            <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                                            <td className="p-4"><Skeleton className="h-8 w-32" /></td>
                                            <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="p-4"><Skeleton className="h-8 w-8 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                                        >
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {user.firstName} {user.lastName}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </span>
                                                    {user.isSuperuser && (
                                                        <Badge variant="secondary" className="mt-1 w-fit text-[10px] h-5 px-1.5">
                                                            <Shield className="mr-1 h-3 w-3" />
                                                            Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <Badge
                                                    variant={user.isActive ? 'default' : 'destructive'}
                                                    className="capitalize"
                                                >
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
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
                                            <td className="p-4 align-middle">
                                                <div className="text-xs space-y-1">
                                                    <div>{user.accountCount} Accounts</div>
                                                    <div>{user.transactionCount} Txns</div>
                                                    <div className="font-medium">
                                                        {formatCurrency(parseFloat(user.totalBalance))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col">
                                                    <span>{formatDate(user.createdAt)}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                                                            <CreditCard className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => onDeleteUser(user.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages || 1}
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages || isLoading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
