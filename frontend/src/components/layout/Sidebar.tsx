/**
 * Sidebar navigation component
 */
import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  ArrowsRightLeftIcon,
  BuildingLibraryIcon,
  FlagIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/helpers'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Transactions', href: '/transactions', icon: ArrowsRightLeftIcon },
  { name: 'Accounts', href: '/accounts', icon: BuildingLibraryIcon },
  { name: 'Goals', href: '/goals', icon: FlagIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function Sidebar() {
  return (
    <nav className="px-4 py-6 space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/30 shadow-sm'
                  : 'text-gray-700 hover:bg-white/40'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        )
      })}
    </nav>
  )
}

