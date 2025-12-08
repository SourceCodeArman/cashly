import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { notificationService } from '@/services/notificationService'
import type { NotificationPreferences } from '@/types'

export function NotificationPreferencesForm() {
    const queryClient = useQueryClient()

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['notificationPreferences'],
        queryFn: async () => {
            const response = await notificationService.getPreferences()
            return response.data
        },
    })

    const mutation = useMutation({
        mutationFn: (newPreferences: Partial<NotificationPreferences>) =>
            notificationService.updatePreferences(newPreferences),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] })
            toast.success('Preferences updated')
        },
        onError: () => {
            toast.error('Failed to update preferences')
        },
    })

    const handleToggle = (key: keyof NotificationPreferences) => {
        if (!preferences) return
        mutation.mutate({ [key]: !preferences[key] })
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-6 w-10" />
                    </div>
                ))}
            </div>
        )
    }

    if (!preferences) return null

    const sections = [
        {
            title: 'Email Notifications',
            icon: Mail,
            items: [
                { key: 'email_transaction', label: 'Transaction Alerts', description: 'Get notified about unusual transactions' },
                { key: 'email_goal', label: 'Goal Milestones', description: 'Updates on your savings goals' },
                { key: 'email_budget', label: 'Budget Alerts', description: 'When you exceed or approach budget limits' },
                { key: 'email_account', label: 'Account Updates', description: 'Important account status changes' },
                { key: 'email_system', label: 'System Announcements', description: 'New features and maintenance updates' },
            ] as const,
        },
        {
            title: 'Push Notifications',
            icon: Bell,
            items: [
                { key: 'push_transaction', label: 'Transaction Alerts', description: 'Get notified about unusual transactions' },
                { key: 'push_goal', label: 'Goal Milestones', description: 'Updates on your savings goals' },
                { key: 'push_budget', label: 'Budget Alerts', description: 'When you exceed or approach budget limits' },
                { key: 'push_account', label: 'Account Updates', description: 'Important account status changes' },
                { key: 'push_system', label: 'System Announcements', description: 'New features and maintenance updates' },
            ] as const,
        },
    ]

    return (
        <div className="space-y-8">
            {sections.map((section) => (
                <div key={section.title} className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <section.icon className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">{section.title}</h3>
                    </div>
                    <div className="space-y-4">
                        {section.items.map((item) => (
                            <div key={item.key} className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor={item.key} className="font-medium">
                                        {item.label}
                                    </Label>
                                    <span className="text-sm text-muted-foreground">
                                        {item.description}
                                    </span>
                                </div>
                                <Switch
                                    id={item.key}
                                    checked={preferences[item.key]}
                                    onCheckedChange={() => handleToggle(item.key)}
                                    disabled={mutation.isPending}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
