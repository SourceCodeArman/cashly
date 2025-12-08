import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUnreadCount } from '@/hooks/useNotifications'
import { NotificationDropdown } from './NotificationDropdown'

export function NotificationBell() {
    const { data: unreadCount = 0 } = useUnreadCount()

    return (
        <NotificationDropdown>
            <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                )}
                <span className="sr-only">Notifications</span>
            </Button>
        </NotificationDropdown>
    )
}
