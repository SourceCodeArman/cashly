/**
 * Mobile bottom navigation component
 */
import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  ArrowsRightLeftIcon,
  BuildingLibraryIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/helpers'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Transactions', href: '/transactions', icon: ArrowsRightLeftIcon },
  { name: 'Accounts', href: '/accounts', icon: BuildingLibraryIcon },
  { name: 'Goals', href: '/goals', icon: FlagIcon },
]

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/60 backdrop-blur border-t border-white/20">
      <div className="grid grid-cols-4 h-16">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive ? 'text-purple-600' : 'text-gray-700'
                )
              }
            >
              <Icon className="h-6 w-6" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

