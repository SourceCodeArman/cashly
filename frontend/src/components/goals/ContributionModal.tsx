/**
 * ContributionModal
 */
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ContributionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FormData) => void
  isSubmitting?: boolean
}

export default function ContributionModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: ContributionModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined as unknown as number,
      date: new Date().toISOString().slice(0, 10),
      note: '',
    },
  })

  const submit = (data: FormData) => {
    onSubmit({
      amount: data.amount,
      date: data.date,
      note: data.note,
    })
    reset()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose()
        reset()
      }}
      title="Add Contribution"
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          error={errors.amount?.message}
          placeholder="50.00"
        />
        <Input
          label="Date"
          type="date"
          {...register('date')}
          error={errors.date?.message}
        />
        <Input
          label="Note (Optional)"
          {...register('note')}
          error={errors.note?.message}
          placeholder="e.g., Transfer from checking"
        />

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} fullWidth>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  )
}


