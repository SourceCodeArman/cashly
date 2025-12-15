import { Link, useLocation } from 'react-router-dom'
import { type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

interface NavLinkProps {
  to: string
  icon: React.ComponentType<LucideProps>
  label: string
  onClick?: () => void
}

export function NavLink({ to, icon: Icon, label, onClick }: NavLinkProps) {
  const location = useLocation()
  const { sidebarOpen } = useUIStore()
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(

        sidebarOpen
          ? cn(
            'relative flex h-9 w-full items-center rounded-lg pl-2 pr-1 text-sm font-medium transition-colors duration-500 ease-in-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )
          : cn('relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors duration-500 ease-in-out'),

        isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground ' : 'text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
      )}
      title={!sidebarOpen ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0 transition-none" />
      <span
        className={cn(
          "whitespace-nowrap overflow-hidden transition-[opacity,max-width,margin] ease-in-out",
          sidebarOpen
            ? "ml-3 opacity-100 max-w-[200px] duration-500 delay-0"
            : "ml-0 opacity-0 max-w-0 w-0 duration-700 delay-300"
        )}
      >
        {label}
      </span>
    </Link>
  )
}

