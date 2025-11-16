/**
 * Notifications modal component
 */
import { useState } from 'react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import NotificationItem from './NotificationItem'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { cn } from '@/utils/helpers'
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@/hooks/useNotifications'

export interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsModal({
  isOpen,
  onClose,
}: NotificationsModalProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { data: notifications = [], isLoading } = useNotifications(
    filter === 'unread' ? { is_read: false } : undefined
  )
  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()
  const deleteNotificationMutation = useDeleteNotification()

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAsRead = async (id: string) => {
    await markAsReadMutation.mutateAsync(id)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync()
  }

  const handleDelete = async (id: string) => {
    await deleteNotificationMutation.mutateAsync(id)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      size="lg"
    >
      <div className="space-y-4">
        {/* Filters and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filter === 'all'
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors relative',
                filter === 'unread'
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white text-violet-600 text-xs rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              isLoading={markAllAsReadMutation.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              message={
                filter === 'unread'
                  ? "You're all caught up!"
                  : "You don't have any notifications yet."
              }
            />
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                onDelete={() => handleDelete(notification.id)}
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

