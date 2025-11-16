/**
 * Settings page
 */
import { useAuth } from '@/hooks/useAuth'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import SubscriptionInfo from '@/components/subscriptions/SubscriptionInfo'

export default function SettingsPage() {
  const { user, logout } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {/* Subscription Section */}
      <SubscriptionInfo />

      {/* Profile Section */}
      <Card className="card-glass">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Username:</span> {user?.username}
          </p>
        </div>
      </Card>

      {/* Account Section */}
      <Card className="card-glass">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <Button variant="danger" onClick={logout}>
          Sign Out
        </Button>
      </Card>
    </div>
  )
}
