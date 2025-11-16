/**
 * Account Selection Modal
 * Allows users to select which accounts to connect and set custom names
 */
import { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import type { AccountConnectionData } from '@/types/account.types'

interface PlaidAccount {
  id: string
  name: string
  type: string
  subtype?: string
  mask?: string
}

interface AccountSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: PlaidAccount[]
  institutionName?: string
  onConfirm: (selectedAccountIds: string[], customNames: Record<string, string>) => void
  isConnecting?: boolean
}

export default function AccountSelectionModal({
  isOpen,
  onClose,
  accounts,
  institutionName,
  onConfirm,
  isConnecting = false,
}: AccountSelectionModalProps) {
  // Track selected accounts (all selected by default)
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(accounts.map(acc => acc.id))
  )
  // Track custom names for each account
  const [customNames, setCustomNames] = useState<Record<string, string>>({})

  // Reset state when modal opens/closes or accounts change
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      setSelectedAccounts(new Set(accounts.map(acc => acc.id)))
      setCustomNames({})
    }
  }, [isOpen, accounts])

  const handleToggleAccount = (accountId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    setSelectedAccounts(newSelected)
  }

  const handleCustomNameChange = (accountId: string, value: string) => {
    setCustomNames(prev => ({
      ...prev,
      [accountId]: value,
    }))
  }

  const handleConfirm = () => {
    if (selectedAccounts.size === 0) {
      return
    }
    onConfirm(Array.from(selectedAccounts), customNames)
  }

  const getAccountDisplayName = (account: PlaidAccount) => {
    return account.mask ? `${account.name} (****${account.mask})` : account.name
  }

  const getAccountTypeLabel = (account: PlaidAccount) => {
    const subtype = account.subtype?.toLowerCase() || ''
    const type = account.type?.toLowerCase() || ''
    
    if (subtype === 'checking' || type === 'depository') return 'Checking'
    if (subtype === 'savings') return 'Savings'
    if (subtype === 'credit card' || type === 'credit') return 'Credit Card'
    if (type === 'investment') return 'Investment'
    return account.subtype || account.type || 'Account'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Select Accounts${institutionName ? ` - ${institutionName}` : ''}`}
      size="lg"
      closeOnOverlayClick={!isConnecting}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select which accounts you'd like to connect. You can optionally set custom names for each account.
        </p>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {accounts.map((account) => {
            const isSelected = selectedAccounts.has(account.id)
            const accountDisplayName = getAccountDisplayName(account)
            const accountTypeLabel = getAccountTypeLabel(account)

            return (
              <div
                key={account.id}
                className={`border rounded-lg p-4 transition-colors ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleAccount(account.id)}
                    disabled={isConnecting}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{accountDisplayName}</p>
                        <p className="text-xs text-gray-500">{accountTypeLabel}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-3">
                        <Input
                          label="Custom Name (optional)"
                          placeholder={accountDisplayName}
                          value={customNames[account.id] || ''}
                          onChange={(e) => handleCustomNameChange(account.id, e.target.value)}
                          disabled={isConnecting}
                          maxLength={200}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {selectedAccounts.size === 0 && (
          <p className="text-sm text-danger-600">Please select at least one account to connect.</p>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={selectedAccounts.size === 0 || isConnecting}
            isLoading={isConnecting}
          >
            Connect {selectedAccounts.size} Account{selectedAccounts.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

