import {
  LayoutDashboard, Wallet,
  Settings,
  Calendar,
  Tag, CreditCard, Bell, DollarSign, BookOpen, BarChart, Repeat, Lightbulb, Receipt, Target
} from 'lucide-react'
import { NavLink } from './NavLink'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const { user } = useAuth()
  const { sidebarOpen } = useUIStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-[240px]' : 'w-14'
      )}
    >
      <div className="flex h-full flex-col bg-sidebar-accent text-sidebar-accent-foreground transition-all duration-300 ease-in-out">
        {/* Logo Header */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border transition-colors duration-500 ease-in-out",
          sidebarOpen ? "p-4 px-[8px]" : "px-[8px] py-4"
        )}>
          <img src="/logo.svg" alt="Cashly Logo" className="h-10 w-10 shrink-0" />
          <h1 className={cn(
            "ml-3 text-lg font-semibold text-sidebar-foreground whitespace-nowrap overflow-hidden transition-[opacity,max-width] ease-in-out",
            sidebarOpen ? "opacity-100 max-w-[200px] duration-500 delay-0" : "opacity-0 max-w-0 w-0 duration-700 delay-300"
          )}>
            Cashly
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 transition-all duration-300 ease-in-out">
          {/* Main Group */}
          <div className="space-y-1">
            <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavLink to="/accounts" icon={Wallet} label="Accounts" />
            <NavLink to="/transactions" icon={Receipt} label="Transactions" />
            <NavLink to="/recurring-transactions" icon={Repeat} label="Recurring" />
            <NavLink to="/goals" icon={Target} label="Goals" />
            <NavLink to="/budgets" icon={DollarSign} label="Budgets" />
            <NavLink to="/bills" icon={Calendar} label="Bills" />
            <NavLink to="/debts" icon={CreditCard} label="Debts" />
            <NavLink to="/analytics" icon={BarChart} label="Analytics" />
            <NavLink to="/insights" icon={Lightbulb} label="Insights" />
            <NavLink to="/categories" icon={Tag} label="Categories" />
          </div>

          {/* Other Group */}
          <div className="space-y-1 pt-4">
            <NavLink to="/subscription" icon={CreditCard} label="Subscription" />
            <NavLink to="/notifications" icon={Bell} label="Notifications" />
            <NavLink to="/settings" icon={Settings} label="Settings" />
            <NavLink to="/docs" icon={BookOpen} label="Documentation" />
          </div>

        </nav>
      </div>
    </aside>
  )
}

