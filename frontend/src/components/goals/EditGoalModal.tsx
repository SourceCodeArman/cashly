/**
 * EditGoalModal
 */
import { useEffect } from 'react'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Goal, GoalUpdateData } from '@/types/goal.types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.number().min(0.01, 'Target amount must be greater than 0'),
  deadline: z.string().optional().nullable(),
  inferred_category_id: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface EditGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal
  onSubmit: (data: GoalUpdateData) => void
  categories?: Array<{ id: string; name: string }>
  isSubmitting?: boolean
}

export default function EditGoalModal({
  isOpen,
  onClose,
  goal,
  onSubmit,
  categories = [],
  isSubmitting,
}: EditGoalModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal.name,
      target_amount: Number(goal.target_amount),
      deadline: goal.deadline || undefined,
      inferred_category_id: goal.inferred_category_id || undefined,
    },
  })

  useEffect(() => {
    // sync when goal changes
    reset({
      name: goal.name,
      target_amount: Number(goal.target_amount),
      deadline: goal.deadline || undefined,
      inferred_category_id: goal.inferred_category_id || undefined,
    })
  }, [goal, reset])

  const submit = (data: FormData) => {
    const payload: GoalUpdateData = {
      name: data.name,
      target_amount: data.target_amount,
      deadline: data.deadline || null,
      inferred_category_id: data.inferred_category_id || null,
    }
    onSubmit(payload)
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); }} title="Edit Goal">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Goal Name"
          {...register('name')}
          error={errors.name?.message}
          placeholder="e.g., Emergency Fund"
        />

        <Input
          label="Target Amount"
          type="number"
          step="0.01"
          {...register('target_amount', { valueAsNumber: true })}
          error={errors.target_amount?.message}
          placeholder="1000.00"
        />

        <Input
          label="Deadline (Optional)"
          type="date"
          {...register('deadline')}
          error={errors.deadline?.message}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Inferred Category (Optional)</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('inferred_category_id')}
            onChange={(e) => setValue('inferred_category_id', e.target.value || undefined)}
            defaultValue={goal.inferred_category_id || ''}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.inferred_category_id?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.inferred_category_id.message}</p>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => { onClose(); }}
            fullWidth
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} fullWidth>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}


