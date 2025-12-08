import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { BillForm } from './BillForm'
import type { Bill, CreateBillForm } from '@/types'
import { useCreateBill, useUpdateBill } from '@/hooks/useBills'

interface BillModalProps {
    isOpen: boolean
    onClose: () => void
    bill?: Bill
}

export function BillModal({ isOpen, onClose, bill }: BillModalProps) {
    const createBill = useCreateBill()
    const updateBill = useUpdateBill()

    const handleSubmit = async (data: CreateBillForm) => {
        try {
            if (bill) {
                await updateBill.mutateAsync({ id: bill.billId, data })
            } else {
                await createBill.mutateAsync(data)
            }
            onClose()
        } catch (error) {
            // Error handled by hook
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{bill ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
                    <DialogDescription>
                        {bill ? 'Update the details of your recurring bill.' : 'Add a new recurring bill to track.'}
                    </DialogDescription>
                </DialogHeader>
                <BillForm
                    initialData={bill}
                    onSubmit={handleSubmit}
                    isLoading={createBill.isPending || updateBill.isPending}
                />
            </DialogContent>
        </Dialog>
    )
}
