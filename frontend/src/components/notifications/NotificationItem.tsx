/**
 * Notification item component
 */
import { formatRelativeTime } from '@/utils/formatters'
import { cn } from '@/utils/helpers'
import type { Notification } from '@/types/notification.types'

export interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
  onMarkAsRead?: () => void
  onDelete?: () => void
}

const typeIcons: Record<string, string> = {
  transaction: '💰',
  goal: '🎯',
  budget: '📊',
  account: '🏦',
  system: '🔔',
}

const typeColors: Record<string, string> = {
  transaction: 'bg-violet-100 text-violet-700',
  goal: 'bg-blue-100 text-blue-700',
  budget: 'bg-purple-100 text-purple-700',
  account: 'bg-cyan-100 text-cyan-700',
  system: 'bg-gray-100 text-gray-700',
}

export default function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead()
    }
    if (onClick) {
      onClick()
    }
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-colors cursor-pointer',
        notification.is_read
          ? 'bg-white border-gray-200 hover:bg-gray-50'
          : 'bg-violet-50/50 border-violet-200 hover:bg-violet-50 card-glass'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg',
            typeColors[notification.type] || typeColors.system
          )}
        >
          {typeIcons[notification.type] || typeIcons.system}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {notification.title}
            </h4>
            {!notification.is_read && (
              <span className="flex-shrink-0 w-2 h-2 bg-violet-500 rounded-full mt-1.5" />
            )}
          </div>

          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatRelativeTime(notification.created_at)}
            </span>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="text-xs text-gray-400 hover:text-danger-500 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

