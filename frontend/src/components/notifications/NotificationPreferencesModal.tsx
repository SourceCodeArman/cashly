import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { NotificationPreferencesForm } from '@/components/settings/NotificationPreferencesForm'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NotificationPreferencesModalProps {
    children?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function NotificationPreferencesModal({
    children,
    open,
    onOpenChange,
}: NotificationPreferencesModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Notification Preferences</DialogTitle>
                    <DialogDescription>
                        Manage how you receive notifications and alerts.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    <NotificationPreferencesForm />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
