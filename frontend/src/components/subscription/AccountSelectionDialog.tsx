import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type Account = {
  account_id: string
  institution_name: string
  custom_name?: string | null
  account_type: string
  balance: string
  account_number_masked?: string | null
}

type AccountSelectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (accountIds: string[]) => Promise<void>
  accounts: Account[]
  freeLimit: number
  excessCount: number
  isLoading: boolean
  initialSelection?: string[] // Pre-selected account IDs
  isEditing?: boolean // Whether editing an existing selection
}

export function AccountSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  accounts,
  freeLimit,
  excessCount,
  isLoading,
  initialSelection = [],
  isEditing = false,
}: AccountSelectionDialogProps) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())

  // Initialize or reset selection when dialog opens
  useEffect(() => {
    if (!open) return

    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      if (initialSelection && initialSelection.length > 0) {
        // Pre-select accounts if initial selection provided
        setSelectedAccountIds(new Set(initialSelection))
      } else {
        // Reset to empty selection
        setSelectedAccountIds(new Set())
      }
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [open, initialSelection])

  const handleToggleAccount = (accountId: string) => {
    const newSelection = new Set(selectedAccountIds)
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId)
    } else {
      if (newSelection.size < freeLimit) {
        newSelection.add(accountId)
      }
    }
    setSelectedAccountIds(newSelection)
  }

  const handleConfirm = async () => {
    if (selectedAccountIds.size === freeLimit) {
      await onConfirm(Array.from(selectedAccountIds))
    }
  }

  const canConfirm = selectedAccountIds.size === freeLimit
  const remaining = freeLimit - selectedAccountIds.size

  const formatAccountType = (accountType: string) => {
    return accountType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border-0 p-0 bg-background/20 backdrop-blur-xl shadow-2xl" overlayClassName="bg-transparent backdrop-blur-sm">
        <div className="absolute inset-0 pointer-events-none rounded-lg border border-white/10 ring-1 ring-black/5" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative flex flex-col h-full p-6"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{isEditing ? 'Edit Account Selection' : 'Select Accounts to Keep'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? `You currently have ${initialSelection?.length || 0} account(s) selected to keep. You can change your selection below.`
                : `You have ${excessCount} account(s) exceeding the free tier limit of ${freeLimit}. Please select which ${freeLimit} accounts you want to keep active.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200/50 bg-amber-50/50 backdrop-blur-sm p-4 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-200 flex-shrink-0 mt-4">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              {remaining > 0
                ? `Select ${remaining} more account${remaining === 1 ? '' : 's'} to keep active.`
                : 'You have selected the maximum number of accounts.'}
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 mt-4 pr-2">
            {accounts && accounts.length > 0 ? (
              accounts.map((account) => {
                if (!account || !account.account_id) return null

                const isSelected = selectedAccountIds.has(account.account_id)
                const isDisabled = !isSelected && selectedAccountIds.size >= freeLimit

                return (
                  <Card
                    key={account.account_id}
                    className={cn(
                      'cursor-pointer transition-all duration-200 border-border/50 bg-background/40 backdrop-blur-sm hover:bg-background/60',
                      isSelected && 'border-primary bg-primary/5 shadow-sm',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !isDisabled && handleToggleAccount(account.account_id)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => !isDisabled && handleToggleAccount(account.account_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {account.custom_name || account.institution_name || 'Unknown Account'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {account.institution_name}
                          {account.account_type && ` • ${formatAccountType(account.account_type)}`}
                          {account.account_number_masked && ` • ${account.account_number_masked}`}
                        </div>
                        <div className="text-sm font-medium mt-1">
                          ${parseFloat(String(account.balance || '0')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="text-center text-muted-foreground py-8">No accounts available</div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-border/20 pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className="shadow-lg shadow-primary/20"
            >
              {isLoading
                ? isEditing
                  ? 'Updating…'
                  : 'Cancelling…'
                : isEditing
                  ? `Save Changes (${selectedAccountIds.size}/${freeLimit} selected)`
                  : `Confirm cancellation (${selectedAccountIds.size}/${freeLimit} selected)`}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

