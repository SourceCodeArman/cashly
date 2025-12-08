import { useEffect } from 'react'
import { Sun, Moon, Monitor, CreditCard } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/components/ThemeProvider'
import { NotificationPreferencesForm } from '@/components/settings/NotificationPreferencesForm'
import { AccountList } from '@/components/settings/AccountList'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { SecuritySettings } from '@/components/settings/SecuritySettings'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { toast } from 'sonner'

function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ]

  return (
    <div className="flex gap-3">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={theme === value ? 'default' : 'outline'}
          className="flex-1 gap-2"
          onClick={() => setTheme(value)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  )
}

export function Settings() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('verify_email')
      if (token) {
        try {
          const response = await authService.verifyEmailChange(token)
          if (response.status === 'success') {
            toast.success('Email updated successfully')
            // Remove query param
            navigate('/settings', { replace: true })
            // Refresh page to update user context (or we could use setUser from store)
            window.location.reload()
          } else {
            toast.error(response.message || 'Failed to verify email change')
          }
        } catch (error: any) {
          toast.error(error.message || 'Failed to verify email change')
        }
      }
    }

    verifyEmail()
  }, [searchParams, navigate])

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Manage your linked bank accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <AccountList />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <SecuritySettings />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div>
                  <div className="font-medium mb-4">Theme</div>
                  <ThemeSelector />
                </div>
              </div>

              <div className="space-y-4">
                <div className="font-medium">Notifications</div>
                <NotificationPreferencesForm />
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Subscription</div>
                    <div className="text-sm text-muted-foreground">
                      Manage your subscription plan and billing
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => window.location.href = '/subscription'}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
