/**
 * Plaid Link component wrapper
 */
import { useEffect, useMemo, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'

import Button from '@/components/common/Button'
import ErrorMessage from '@/components/common/ErrorMessage'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { AccountConnectionData } from '@/types/account.types'
import { getPlaidErrorMessage } from '@/utils/plaidErrors'

interface PlaidLinkProps {
  linkToken?: string
  isLoadingToken: boolean
  isConnecting: boolean
  onCreateLinkToken: () => Promise<unknown>
  onConnect: (payload: AccountConnectionData) => Promise<unknown>
  onClose: () => void
}

interface PlaidLinkButtonProps {
  token: string
  isConnecting: boolean
  onConnect: (payload: AccountConnectionData) => Promise<unknown>
  onClose: () => void
  onError: (message: string) => void
}

function PlaidLinkButton({
  token,
  isConnecting,
  onConnect,
  onClose,
  onError,
}: PlaidLinkButtonProps) {
  const [isOpening, setIsOpening] = useState(false)

  const config = useMemo(
    () => ({
      token,
      onSuccess: async (publicToken: string, metadata: any) => {
        try {
          setIsOpening(false)
          await onConnect({
            public_token: publicToken,
            institution_id: metadata?.institution?.institution_id ?? '',
            institution_name: metadata?.institution?.name ?? undefined,
            selected_account_ids: metadata?.accounts?.map((account: any) => account.id) ?? [],
          })
          onClose()
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unable to connect account. Please try again.'
          onError(message)
        }
      },
      onExit: (err: any) => {
        setIsOpening(false)
        if (err?.error_code) {
          onError(getPlaidErrorMessage(err.error_code, err.display_message) ?? err.error_message)
        }
      },
    }),
    [token, onConnect, onClose, onError]
  )

  const { open, ready, error } = usePlaidLink(config)

  useEffect(() => {
    if (error?.error_code) {
      onError(getPlaidErrorMessage(error.error_code, error.display_message) ?? error.error_message)
    }
  }, [error, onError])

  const handleOpen = () => {
    if (!ready) return
    setIsOpening(true)
    open()
  }

  return (
    <div className="space-y-4">
      <Button
        variant="primary"
        onClick={handleOpen}
        disabled={!ready || isOpening || isConnecting}
        fullWidth
      >
        {isOpening || isConnecting ? 'Connecting...' : 'Launch Plaid'}
      </Button>
      <p className="text-xs text-gray-500 text-center">
        You will be securely redirected to Plaid to select your financial institution.
      </p>
    </div>
  )
}

export default function PlaidLink({
  linkToken,
  isLoadingToken,
  isConnecting,
  onCreateLinkToken,
  onConnect,
  onClose,
}: PlaidLinkProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!linkToken && !isLoadingToken) {
      onCreateLinkToken().catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Unable to initiate Plaid Link. Please try again.'
        setErrorMessage(message)
      })
    } else if (linkToken) {
      setErrorMessage(null)
    }
  }, [linkToken, isLoadingToken, onCreateLinkToken])

  return (
    <div className="space-y-4">
      {isLoadingToken && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {!isLoadingToken && errorMessage && (
        <ErrorMessage
          message={errorMessage}
          onRetry={() => {
            setErrorMessage(null)
            onCreateLinkToken().catch((error) => {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Unable to initiate Plaid Link. Please try again.'
              setErrorMessage(message)
            })
          }}
        />
      )}

      {!isLoadingToken && linkToken && !errorMessage && (
        <PlaidLinkButton
          token={linkToken}
          isConnecting={isConnecting}
          onConnect={onConnect}
          onClose={onClose}
          onError={(message) => setErrorMessage(message)}
        />
      )}

      <Button variant="secondary" onClick={onClose} fullWidth>
        Cancel
      </Button>
    </div>
  )
}


