import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import type { DebtAccount } from '@/types/debt.types'
import { DebtPaymentForm } from './DebtPaymentForm'

interface DebtPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    debt: DebtAccount
}

export function DebtPaymentModal({ isOpen, onClose, debt }: DebtPaymentModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Record a payment for {debt.name}. Assumes interest is paid first.
                    </DialogDescription>
                </DialogHeader>
                <DebtPaymentForm debt={debt} onSuccess={onClose} />
            </DialogContent>
        </Dialog>
    )
}
