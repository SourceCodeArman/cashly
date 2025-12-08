import { Bell, Check, Trash2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    useNotifications,
    useMarkNotificationAsRead,
    useMarkAllNotificationsAsRead,
    useDeleteNotification,
    useUnreadCount,
} from '@/hooks/useNotifications'
import { formatRelativeTime, cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { NotificationPreferencesModal } from './NotificationPreferencesModal'

interface NotificationDropdownProps {
    children: React.ReactNode
}

export function NotificationDropdown({ children }: NotificationDropdownProps) {
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [showPreferences, setShowPreferences] = useState(false)
    const { data: notificationsData, isLoading } = useNotifications()
    const { data: unreadCount = 0 } = useUnreadCount()
    const markAsRead = useMarkNotificationAsRead()
    const markAllAsRead = useMarkAllNotificationsAsRead()
    const deleteNotification = useDeleteNotification()

    const notifications = notificationsData?.results || []
    // Show only the first 5 notifications in the dropdown
    const recentNotifications = notifications.slice(0, 5)

    const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        markAsRead.mutate(id)
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        deleteNotification.mutate(id)
    }

    const handleMarkAllAsRead = (e: React.MouseEvent) => {
        e.preventDefault()
        markAllAsRead.mutate()
    }

    const handleViewAll = () => {
        setOpen(false)
        navigate('/notifications')
    }

    return (
        <>
            <NotificationPreferencesModal
                open={showPreferences}
                onOpenChange={setShowPreferences}
            />
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Notifications</span>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-primary"
                                    onClick={handleMarkAllAsRead}
                                    disabled={markAllAsRead.isPending}
                                >
                                    Mark all read
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                    e.preventDefault()
                                    setOpen(false)
                                    setShowPreferences(true)
                                }}
                                title="Notification Preferences"
                            >
                                <Settings className="h-4 w-4" />
                                <span className="sr-only">Preferences</span>
                            </Button>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[300px]">
                        {isLoading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        ) : recentNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">No notifications</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {recentNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "relative flex gap-3 border-b p-4 text-sm transition-colors hover:bg-muted/50",
                                            !notification.isRead && "bg-muted/20"
                                        )}
                                    >
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={cn("font-medium leading-none", !notification.isRead && "text-primary")}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatRelativeTime(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {!notification.isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => handleMarkAsRead(e, notification.id)}
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-3 w-3" />
                                                    <span className="sr-only">Mark as read</span>
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => handleDelete(e, notification.id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer justify-center text-center font-medium text-primary"
                        onClick={handleViewAll}
                    >
                        View all notifications
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
