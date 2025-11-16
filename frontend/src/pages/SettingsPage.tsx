/**
 * Settings page
 */
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAccounts } from '@/hooks/useAccounts'
import { useUnreadCount } from '@/hooks/useNotifications'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import SubscriptionInfo from '@/components/subscriptions/SubscriptionInfo'
import NotificationsModal from '@/components/notifications/NotificationsModal'
import AccountDetailModal from '@/components/accounts/AccountDetailModal'
import { BellIcon } from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { accounts, syncAccount, deleteAccount, isSyncing, isDeleting } = useAccounts()
  const { data: unreadCount = 0 } = useUnreadCount()
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const handleAccountSync = async (accountId: string) => {
    await syncAccount(accountId)
  }

  const handleAccountDisconnect = async (accountId: string) => {
    deleteAccount(accountId)
  }

  const selectedAccountData = accounts.find((acc) => acc.account_id === selectedAccount)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {/* Subscription Section */}
      <SubscriptionInfo />

      {/* Notifications Section */}
      <Card className="card-glass">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowNotificationsModal(true)}
            leftIcon={<BellIcon className="h-5 w-5" />}
          >
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-danger-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
            View All
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {unreadCount > 0 ? (
            <p>You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          ) : (
            <p>You're all caught up! No unread notifications.</p>
          )}
        </div>
      </Card>

      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />

      {/* Account Management Section */}
      <Card className="card-glass">
        <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-gray-600 mb-4">No accounts connected</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedAccount(account.account_id)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {account.custom_name || account.institution_name}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {account.account_type.replace('_', ' ')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ${parseFloat(account.balance).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {account.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={() => (window.location.href = '/accounts')}
            fullWidth
          >
            Manage Accounts
          </Button>
        </div>
      </Card>

      {selectedAccountData && (
        <AccountDetailModal
          isOpen={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
          account={selectedAccountData}
          onSync={handleAccountSync}
          onDisconnect={handleAccountDisconnect}
          isSyncing={isSyncing}
          isDisconnecting={isDeleting}
        />
      )}

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
          {user?.subscription_tier && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Subscription Tier:</span>{' '}
              <span className="capitalize">{user.subscription_tier}</span>
            </p>
          )}
        </div>
      </Card>

      {/* Account Section */}
      <Card className="card-glass">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <Button variant="danger" onClick={logout} fullWidth>
          Sign Out
        </Button>
      </Card>
    </div>
  )
}
