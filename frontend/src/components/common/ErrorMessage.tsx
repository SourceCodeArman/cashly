/**
 * Error message component
 */
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import Button from './Button'
import { cn } from '@/utils/helpers'

export interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export default function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
  className,
}: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-danger-50 border border-danger-200 p-4',
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        <ExclamationCircleIcon className="h-5 w-5 text-danger-600 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-danger-800">{title}</h3>
          <p className="mt-1 text-sm text-danger-700">{message}</p>
          {(onRetry || onDismiss) && (
            <div className="mt-4 flex gap-2">
              {onRetry && (
                <Button variant="danger" size="sm" onClick={onRetry}>
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button variant="secondary" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

