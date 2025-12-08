import { PanelLeft, Shield, User, LogOut, Search, ChevronLeft, ChevronRight, Zap, Bell, RefreshCw, Menu } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Input } from '@/components/ui/input'
import * as React from 'react'

// Simple kbd component for keyboard shortcuts
const Kbd = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <kbd className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs", className)}>
    {children}
  </kbd>
)

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useUIStore()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})

SidebarTrigger.displayName = "SidebarTrigger"

interface HeaderProps {
  variant?: 'default' | 'admin'
}

export function Header({ variant = 'default' }: HeaderProps = {}) {
  const { user } = useAuth()
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = variant === 'admin'
  const [searchQuery, setSearchQuery] = React.useState('')

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0).toUpperCase() || ''
    const last = lastName?.charAt(0).toUpperCase() || ''
    return first + last || 'U'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleBackToUser = () => {
    navigate('/dashboard')
  }

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    window.location.reload()
  }

  const handleQuickActions = () => {
    // TODO: Implement quick actions modal
    console.log('Quick actions clicked')
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      isAdmin ? "" : "sticky top-0 z-30"
    )}>
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4">
        {/* Left Section */}
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Admin</h1>
            </div>
          </div>
        ) : (
        <SidebarTrigger className="ml-2" />
        )}

        {/* Center Section - Search (Admin only) */}
        {isAdmin && (
          <div className="hidden md:flex flex-1 max-w-sm mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admin dashboard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4"
              />
            </div>
          </div>
        )}

        {/* Navigation Arrows (Admin only) */}
        {isAdmin && (
          <div className="hidden md:flex items-center gap-1 mr-2">
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="Go back (Alt+Left)"
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="Go forward (Alt+Right)"
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToUser}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Back to User Dashboard
              </Button>

              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>

              <div className="shrink-0 bg-border w-[1px] h-6" />

              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickActions}
                className="hidden md:flex"
                title="Quick Actions"
              >
                <Zap className="h-4 w-4 mr-2" />
                Quick Actions
                <Kbd className="ml-2">
                  <kbd className="h-3 w-3 mr-1">⌘</kbd>K
                </Kbd>
              </Button>

              <Button variant="ghost" size="sm" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-9 w-9"
                title="Refresh all data (Ctrl+R)"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-9 w-9"
                title="Menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
          <NotificationBell />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

