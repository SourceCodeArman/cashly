/**
 * Header component
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Transition } from '@headlessui/react'
import { Bars3Icon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { uiStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadCount } from '@/hooks/useNotifications'
import { formatCurrency } from '@/utils/formatters'
import { useAccounts } from '@/hooks/useAccounts'
import NotificationsModal from '@/components/notifications/NotificationsModal'

export default function Header() {
  const { user, logout } = useAuth()
  const { toggleSidebar } = uiStore()
  const { accounts } = useAccounts()
  const { data: unreadCount = 0 } = useUnreadCount()
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0)

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-transparent">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-700 hover:text-slate-800 hover:bg-white/70"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <Link to="/dashboard" className="flex items-center">
              <span className="text-2xl font-semibold text-slate-800 hover:opacity-90">Cashly</span>
            </Link>
          </div>

          {/* Center: Balance (Mobile only) */}
          <div className="lg:hidden">
            <div className="text-sm font-semibold text-slate-800">
              {formatCurrency(totalBalance)}
            </div>
          </div>

          {/* Right: Notifications and User Menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              type="button"
              className="p-2 rounded-md text-gray-700 hover:text-slate-800 hover:bg-white/70 relative"
              aria-label="Notifications"
              onClick={() => setShowNotificationsModal(true)}
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-danger-500 rounded-full flex items-center justify-center text-xs text-white font-semibold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 p-2 rounded-md text-gray-700 hover:text-slate-800 hover:bg-white/70">
                <UserCircleIcon className="h-6 w-6" />
                <span className="hidden sm:block text-sm font-medium">{user?.username || 'User'}</span>
              </Menu.Button>
              
              <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md bg-white/90 backdrop-blur shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings"
                          className={`${active ? 'bg-white/70' : ''} block px-4 py-2 text-sm text-gray-700`}
                        >
                          Settings
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={logout}
                          className={`${active ? 'bg-white/70' : ''} block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />
    </header>
  )
}

