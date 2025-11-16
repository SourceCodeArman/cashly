/**
 * TransferModal - Modal for executing transfers from accounts to goals
 */
import { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Account } from '@/types/account.types'
import { formatCurrency } from '@/utils/formatters'

const schema = z.object({
  source_account_id: z.string().min(1, 'Source account is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().max(10, 'Description must be 10 characters or less').optional(),
})

type FormData = z.infer<typeof schema>

type TransferProgressStep = 'idle' | 'validating' | 'authorizing' | 'transferring' | 'completing' | 'success' | 'error'

interface TransferProgress {
  step: TransferProgressStep
  message: string
  error?: string
}

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<any>
  goalId: string
  destinationAccountId?: string | null
  destinationAccountName?: string
  accounts: Account[]
  isSubmitting?: boolean
}

export default function TransferModal({
  isOpen,
  onClose,
  onSubmit,
  goalId: _goalId,
  destinationAccountId,
  destinationAccountName,
  accounts,
  isSubmitting,
}: TransferModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      source_account_id: '',
      amount: undefined as unknown as number,
      description: 'Goal contr', // 10 chars (Plaid API limit)
    },
  })

  const selectedAccountId = watch('source_account_id')
  const selectedAccount = accounts.find((acc) => acc.account_id === selectedAccountId)
  const destinationAccount = destinationAccountId 
    ? accounts.find((acc) => acc.account_id === destinationAccountId)
    : null

  // State for transfer progress
  const [transferProgress, setTransferProgress] = useState<TransferProgress>({
    step: 'idle',
    message: '',
  })

  // Filter accounts to only show checking/savings and exclude destination account
  const availableAccounts = accounts.filter(
    (acc) =>
      acc.account_type === 'checking' ||
      acc.account_type === 'savings'
  ).filter((acc) => acc.account_id !== destinationAccountId)

  useEffect(() => {
    if (isOpen) {
      reset({
        source_account_id: '',
        amount: undefined as unknown as number,
        description: 'Goal contr',
      })
      setTransferProgress({
        step: 'idle',
        message: '',
      })
    }
  }, [isOpen, reset])

  // Helper function to get user-friendly error message
  const getErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred'
    
    const errorCode = error.response?.data?.error_code
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred'
    
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        return `Validation error: ${errorMessage}`
      case 'PERMISSION_DENIED':
        return 'You do not have permission to perform this transfer'
      case 'PLAID_ERROR':
        if (errorMessage.includes('authorization')) {
          return 'Authorization failed. Please try re-authorizing the transfer.'
        }
        if (errorMessage.includes('insufficient funds')) {
          return 'Insufficient funds in source account'
        }
        return `Transfer error: ${errorMessage}`
      case 'INTERNAL_ERROR':
        return 'An unexpected error occurred. Please try again later.'
      default:
        return errorMessage
    }
  }

  const submit = async (data: FormData) => {
    try {
      // Step 1: Validating
      setTransferProgress({
        step: 'validating',
        message: 'Validating transfer request...',
      })

      // Validate that the transfer amount doesn't exceed the source account balance
      if (selectedAccount) {
        const sourceBalance = parseFloat(selectedAccount.balance)
        if (data.amount > sourceBalance) {
          setTransferProgress({
            step: 'error',
            message: 'Transfer failed',
            error: `Insufficient funds. Available balance: ${formatCurrency(sourceBalance)}, Transfer amount: ${formatCurrency(data.amount)}`,
          })
          return
        }
      }

      // Step 2: Authorizing (backend will handle this)
      setTransferProgress({
        step: 'authorizing',
        message: 'Checking authorization...',
      })

      // Call the onSubmit handler (which will call the API)
      const result = await onSubmit({
        source_account_id: data.source_account_id,
        amount: data.amount,
        description: (data.description && data.description.trim()) || 'Goal contr',
      })

      // Check if authorization was created (result is the response.data which includes status_details)
      if (result?.status_details?.authorization_created) {
        setTransferProgress({
          step: 'authorizing',
          message: 'Creating transfer authorization...',
        })
        // Small delay to show the authorization step
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      // Step 3: Transferring
      setTransferProgress({
        step: 'transferring',
        message: 'Executing transfer...',
      })

      // Small delay to show the transferring step
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 4: Completing
      setTransferProgress({
        step: 'completing',
        message: 'Completing transfer...',
      })

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300))

      // Step 5: Success
      setTransferProgress({
        step: 'success',
        message: 'Transfer initiated successfully!',
      })

      // Close modal after a short delay
      setTimeout(() => {
        handleClose()
      }, 1500)

    } catch (error: any) {
      const errorMessage = getErrorMessage(error)
      setTransferProgress({
        step: 'error',
        message: 'Transfer failed',
        error: errorMessage,
      })
    }
  }

  const handleClose = () => {
    // Reset form and progress state when closing
    reset()
    setTransferProgress({
      step: 'idle',
      message: '',
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer to Goal"
      description={`Transfer funds from your account to ${destinationAccountName || 'goal account'}`}
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div>
          <label htmlFor="source_account_id" className="block text-sm font-medium text-gray-700 mb-1">
            From Account
          </label>
          <div className="relative">
            <select
              id="source_account_id"
              {...register('source_account_id')}
              className={`
                w-full px-4 py-2 
                border rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-offset-0 
                transition-colors
                appearance-none
                pr-10
                bg-white
                text-gray-900
                ${errors.source_account_id
                  ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 hover:border-gray-400'
                }
                disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
              `}
            >
              <option value="">Select source account</option>
              {availableAccounts.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {account.custom_name || account.institution_name} - {account.account_type} (
                  {account.account_number_masked}) - {formatCurrency(parseFloat(account.balance))}
                </option>
              ))}
            </select>
            {/* Chevron Icon */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg 
                className={`w-5 h-5 transition-colors ${
                  errors.source_account_id ? 'text-danger-500' : 'text-gray-400'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.source_account_id && (
            <p className="mt-1 text-sm text-danger-600" role="alert">
              {errors.source_account_id.message}
            </p>
          )}
          {selectedAccount && !errors.source_account_id && (
            <p className="mt-1 text-xs text-gray-500">
              Available balance: {formatCurrency(parseFloat(selectedAccount.balance))}
            </p>
          )}
        </div>

        <Input
          label="Amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          error={errors.amount?.message}
          placeholder="100.00"
        />

        <Input
          label="Description (Optional, max 10 chars)"
          {...register('description')}
          error={errors.description?.message}
          placeholder="Goal contr"
          maxLength={10}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">Transfer Details:</p>
          <p>
            Transferring from:{' '}
            <strong>
              {selectedAccount
                ? `${selectedAccount.custom_name || selectedAccount.institution_name} - ${selectedAccount.account_type} (${selectedAccount.account_number_masked})`
                : 'Select account'}
            </strong>
          </p>
          <p>
            Transferring to:{' '}
            <strong>
              {destinationAccount
                ? `${destinationAccountName || destinationAccount.custom_name || destinationAccount.institution_name} (${destinationAccount.account_number_masked})`
                : destinationAccountName || 'Goal account'}
            </strong>
          </p>
        </div>

        {/* Transfer Progress Indicator */}
        {transferProgress.step !== 'idle' && (
          <div className={`border rounded-md p-4 ${
            transferProgress.step === 'success' 
              ? 'bg-green-50 border-green-200' 
              : transferProgress.step === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              {/* Success Icon */}
              {transferProgress.step === 'success' && (
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {/* Error Icon */}
              {transferProgress.step === 'error' && (
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {/* Loading Spinner */}
              {(transferProgress.step === 'validating' || 
                transferProgress.step === 'authorizing' || 
                transferProgress.step === 'transferring' || 
                transferProgress.step === 'completing') && (
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  transferProgress.step === 'success' 
                    ? 'text-green-800' 
                    : transferProgress.step === 'error'
                    ? 'text-red-800'
                    : 'text-blue-800'
                }`}>
                  {transferProgress.message}
                </p>
                {transferProgress.error && (
                  <p className="mt-1 text-sm text-red-600">{transferProgress.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleClose}
            fullWidth
            disabled={
              transferProgress.step === 'validating' || 
              transferProgress.step === 'authorizing' || 
              transferProgress.step === 'transferring' || 
              transferProgress.step === 'completing'
            }
          >
            {transferProgress.step === 'error' || transferProgress.step === 'success' ? 'Close' : 'Cancel'}
          </Button>
          {transferProgress.step === 'error' ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                // Reset progress to allow retry
                setTransferProgress({
                  step: 'idle',
                  message: '',
                })
              }}
              fullWidth
            >
              Try Again
            </Button>
          ) : (
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={
                (isSubmitting || 
                  transferProgress.step === 'validating' ||
                  transferProgress.step === 'authorizing' ||
                  transferProgress.step === 'transferring' ||
                  transferProgress.step === 'completing')
              } 
              fullWidth
              disabled={transferProgress.step === 'success'}
            >
              {transferProgress.step === 'success' ? 'Success!' : 'Transfer'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}

