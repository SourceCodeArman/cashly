/**
 * Account card component
 */
import { useState, useRef, useEffect } from 'react'
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import { formatCurrency, formatRelativeTime, formatAccountNumber } from '@/utils/formatters'
import type { Account } from '@/types/account.types'

export interface AccountCardProps {
  account: Account
  onSync?: () => Promise<void> | void
  onDelete?: () => void
  onUpdate?: (accountId: string, updates: { custom_name?: string | null }) => Promise<void>
  isSyncing?: boolean
  isUpdating?: boolean
}

export default function AccountCard({
  account,
  onSync,
  onDelete,
  onUpdate,
  isSyncing,
  isUpdating,
}: AccountCardProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(account.custom_name || '')
  const [recentlySynced, setRecentlySynced] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const ignoreBlurRef = useRef(false)
  const formattedAccountNumber = formatAccountNumber(account.account_number_masked)
  const displayName = account.custom_name || account.institution_name

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingName])

  // Reset edited name when account changes
  useEffect(() => {
    setEditedName(account.custom_name || '')
  }, [account.custom_name])

  const handleStartEdit = () => {
    setEditedName(account.custom_name || '')
    setIsEditingName(true)
  }


  const handleSaveName = async () => {
    if (!onUpdate) return
    
    ignoreBlurRef.current = true
    const newName = editedName.trim() || null
    // Only update if the name actually changed
    if (newName !== account.custom_name) {
      try {
        await onUpdate(account.account_id, { custom_name: newName })
      } catch (error) {
        // Error is handled by the mutation
        setEditedName(account.custom_name || '')
      }
    }
    setIsEditingName(false)
    // Reset after a brief delay to allow button click to complete
    setTimeout(() => {
      ignoreBlurRef.current = false
    }, 100)
  }

  const handleCancelEditName = () => {
    ignoreBlurRef.current = true
    setEditedName(account.custom_name || '')
    setIsEditingName(false)
    setTimeout(() => {
      ignoreBlurRef.current = false
    }, 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName()
    } else if (e.key === 'Escape') {
      handleCancelEditName()
    }
  }

  const handleSync = async () => {
    if (onSync) {
      setRecentlySynced(false)
      try {
        await onSync()
        // Show "Synced" state briefly after sync completes
        setRecentlySynced(true)
        setTimeout(() => setRecentlySynced(false), 2000)
      } catch (error) {
        // Error is handled by the mutation
      }
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Only save on blur if not clicking a button
                  if (!ignoreBlurRef.current) {
                    handleSaveName()
                  }
                }}
                placeholder={account.institution_name}
                className="text-lg font-semibold text-gray-900 border border-primary-500 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                maxLength={200}
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={isUpdating}
                className="p-1 text-success-600 hover:text-success-700 disabled:opacity-50"
                title="Save"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleCancelEditName}
                disabled={isUpdating}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Cancel"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {displayName}
              </h3>
              {onUpdate && (
                <button
                  onClick={handleStartEdit}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
                  title="Edit name"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {!account.custom_name && (
            <p className="text-xs text-gray-400 mt-0.5">{account.institution_name}</p>
          )}
          <p className="text-sm text-gray-500 capitalize mt-1">{account.account_type}</p>
          {formattedAccountNumber && (
            <p className="text-xs text-gray-400 mt-1 font-mono tracking-wider">
              {formattedAccountNumber}
            </p>
          )}
        </div>
        <div className="text-right ml-4">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(parseFloat(account.balance), account.currency)}
          </p>
        </div>
      </div>

      {account.last_synced_at && (
        <p className="text-xs text-gray-500 mb-4">
          Last synced {formatRelativeTime(account.last_synced_at)}
        </p>
      )}

      <div className="flex gap-2">
        {onSync && (
          <Button
            variant={recentlySynced ? "success" : "primary"}
            size="sm"
            onClick={handleSync}
            isLoading={isSyncing && !recentlySynced}
            disabled={isSyncing}
            fullWidth
          >
            {recentlySynced ? 'Synced!' : 'Sync'}
          </Button>
        )}
        {onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete} fullWidth>
            Disconnect
          </Button>
        )}
      </div>
    </Card>
  )
}

