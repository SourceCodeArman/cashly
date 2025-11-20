import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

type SubscriptionCancelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isLoading: boolean
  planName?: string
  currentPeriodEnd?: string
}

export function SubscriptionCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  planName,
  currentPeriodEnd,
}: SubscriptionCancelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden border-0 p-0 bg-background/20 backdrop-blur-xl shadow-2xl" overlayClassName="bg-transparent backdrop-blur-sm">
        <div className="absolute inset-0 pointer-events-none rounded-lg border border-white/10 ring-1 ring-black/5" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative p-6"
        >
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
            <DialogDescription>
              {planName
                ? `Your ${planName} plan will remain available until the current billing period ends.`
                : 'Your plan will remain available until the current billing period ends.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2 rounded-md border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground backdrop-blur-sm">
            <p>
              {currentPeriodEnd
                ? `You will retain access until ${formatDate(currentPeriodEnd)} and will not be charged again.`
                : 'You will retain access until the current billing period ends and will not be charged again.'}
            </p>
            <p>You can re-subscribe at any time.</p>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80">
              Keep subscription
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm} disabled={isLoading} className="shadow-lg shadow-destructive/20">
              {isLoading ? 'Cancelling…' : 'Confirm cancellation'}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}


