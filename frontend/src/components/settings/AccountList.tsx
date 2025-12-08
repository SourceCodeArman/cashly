import { useState } from 'react'
import { Loader2, Trash2, RefreshCw, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
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
import { useAccounts, useDisconnectAccount, useSyncAccount } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/utils'

export function AccountList() {
    const { data: accounts, isLoading } = useAccounts()
    const disconnectMutation = useDisconnectAccount()
    const syncMutation = useSyncAccount()
    const [accountToDisconnect, setAccountToDisconnect] = useState<string | null>(null)

    const handleDisconnect = async () => {
        if (accountToDisconnect) {
            await disconnectMutation.mutateAsync(accountToDisconnect)
            setAccountToDisconnect(null)
        }
    }

    const handleSync = (id: string) => {
        syncMutation.mutate(id)
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-24" />
                    </div>
                ))}
            </div>
        )
    }

    if (!accounts || accounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <Building2 className="mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-medium">No Connected Accounts</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                    Connect your bank accounts to track your finances automatically.
                </p>
                <Button variant="outline">Connect Account</Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {accounts.map((account) => (
                <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-medium">{account.institutionName}</div>
                            <div className="text-sm text-muted-foreground">
                                {account.name || account.accountType} • {account.maskedAccountNumber}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                Last synced: {account.updatedAt ? format(new Date(account.updatedAt), 'PP p') : 'Never'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="font-medium">{formatCurrency(Number(account.balance))}</div>
                            <div className={`text-xs ${account.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                {account.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSync(account.id)}
                                disabled={syncMutation.isPending}
                                title="Sync Account"
                            >
                                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>

                            <AlertDialog open={accountToDisconnect === account.id} onOpenChange={(open) => !open && setAccountToDisconnect(null)}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setAccountToDisconnect(account.id)}
                                        title="Disconnect Account"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to disconnect this account? This will stop automatic updates and remove the account from your dashboard.
                                            Transactions already imported will be preserved.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDisconnect}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {disconnectMutation.isPending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                'Disconnect'
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
