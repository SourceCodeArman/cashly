import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function Notifications() {
  const { data: notificationsData, isLoading } = useNotifications()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const deleteNotification = useDeleteNotification()

  const notifications = notificationsData?.results || []

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate()
  }

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id)
  }

  // Group notifications by date
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(notification)
    return acc
  }, {} as Record<string, typeof notifications>)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            View and manage your notifications
          </p>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={markAllAsRead.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No notifications</h3>
            <p className="text-center text-sm text-muted-foreground">
              You're all caught up! New notifications will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <div key={date} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{date}</h2>
              <div className="space-y-2">
                {dateNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={cn(
                      'border-border shadow-soft transition-shadow hover:shadow-md',
                      !notification.isRead && 'border-l-4 border-l-primary'
                    )}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          {!notification.isRead && (
                            <Badge variant="default" className="h-2 w-2 rounded-full p-0" />
                          )}
                        </div>
                        <CardDescription>{notification.message}</CardDescription>
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsRead.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(notification.id)}
                          disabled={deleteNotification.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

