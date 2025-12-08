import { useState, useEffect } from 'react'
import {
  Shield,
  LayoutDashboard,
  Users,
  Heart,
  FileText,
  BarChart3,
  Link2,
  Database,
  Wrench,
  Search,
  Settings,
  ChevronRight,
  Home,
  RefreshCw
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QuickActions, useKeyboardShortcuts } from '@/components/admin/QuickActions'
import { OverviewTab } from '@/components/admin/tabs/OverviewTab'
import { UsersTab } from '@/components/admin/tabs/UsersTab'
import { SystemHealthTab } from '@/components/admin/tabs/SystemHealthTab'
import { LogsTab } from '@/components/admin/tabs/LogsTab'
import { APIAnalyticsTab } from '@/components/admin/tabs/APIAnalyticsTab'
import { IntegrationsTab } from '@/components/admin/tabs/IntegrationsTab'
import { DatabaseTab } from '@/components/admin/tabs/DatabaseTab'
import { DebuggingToolsTab } from '@/components/admin/tabs/DebuggingToolsTab'
import { adminService } from '@/services/adminService'
import { toast } from 'sonner'

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'System metrics & status' },
  { id: 'users', label: 'Users', icon: Users, description: 'User management & accounts' },
  { id: 'health', label: 'Health', icon: Heart, description: 'System health monitoring' },
  { id: 'logs', label: 'Logs', icon: FileText, description: 'System logs & events' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'API & performance analytics' },
  { id: 'integrations', label: 'Integrations', icon: Link2, description: 'External service status' },
  { id: 'database', label: 'Database', icon: Database, description: 'Database management' },
  { id: 'debug', label: 'Debug', icon: Wrench, description: 'Debugging tools' },
]

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [breadcrumb, setBreadcrumb] = useState(['Admin Dashboard'])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [navigationHistory, setNavigationHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    const currentNav = navigationItems.find(item => item.id === activeTab)
    if (currentNav) {
      setBreadcrumb(['Admin Dashboard', currentNav.label])
    }
  }, [activeTab])

  // Navigation history management
  useEffect(() => {
    if (activeTab && !navigationHistory.includes(activeTab)) {
      const newHistory = [...navigationHistory, activeTab].slice(-10) // Keep last 10
      setNavigationHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [activeTab])

  const navigateBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setActiveTab(navigationHistory[newIndex])
    }
  }

  const navigateForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setActiveTab(navigationHistory[newIndex])
    }
  }

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < navigationHistory.length - 1

  // Global refresh function
  const handleGlobalRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Refresh all admin data
      await Promise.all([
        // Add refresh calls for different data types
        adminService.getSystemStats(),
        // Add other refresh calls as needed
      ])
      toast.success('All data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh some data')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+r': handleGlobalRefresh,
    'alt+left': navigateBack,
    'alt+right': navigateForward,
    'ctrl+1': () => setActiveTab('overview'),
    'ctrl+2': () => setActiveTab('users'),
    'ctrl+3': () => setActiveTab('health'),
    'ctrl+4': () => setActiveTab('logs'),
    'ctrl+5': () => setActiveTab('analytics'),
    'ctrl+6': () => setActiveTab('integrations'),
    'ctrl+7': () => setActiveTab('database'),
    'ctrl+8': () => setActiveTab('debug'),
    'alt+h': () => window.open('/admin/docs', '_blank'),
  })

  // Quick actions for the admin dashboard
  const quickActions = [
    {
      id: 'refresh-all',
      label: 'Refresh All Data',
      description: 'Reload all admin dashboard data',
      icon: RefreshCw,
      shortcut: 'Ctrl+R',
      action: handleGlobalRefresh,
      category: 'common' as const
    },
    {
      id: 'switch-overview',
      label: 'Go to Overview',
      description: 'Navigate to system overview',
      icon: LayoutDashboard,
      shortcut: 'Ctrl+1',
      action: () => setActiveTab('overview'),
      category: 'common' as const
    },
    {
      id: 'switch-users',
      label: 'Go to Users',
      description: 'Navigate to user management',
      icon: Users,
      shortcut: 'Ctrl+2',
      action: () => setActiveTab('users'),
      category: 'user' as const
    },
    {
      id: 'switch-health',
      label: 'Go to Health',
      description: 'Navigate to system health',
      icon: Heart,
      shortcut: 'Ctrl+3',
      action: () => setActiveTab('health'),
      category: 'system' as const
    }
  ]

  const NavigationContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const shortcuts = ['1', '2', '3', '4', '5', '6', '7', '8']

    return (
      <div className={`space-y-2 ${isMobile ? 'px-2' : ''}`}>
        {navigationItems.map((item, index) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const shortcut = shortcuts[index]

  return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                if (isMobile) setIsMobileMenuOpen(false)
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 group
                ${isActive
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${isActive ? 'text-primary' : ''}`}>
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.description}
                </div>
              </div>
        <div className="flex items-center gap-2">
                <kbd className={`hidden group-hover:inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-mono ${
                  isActive ? 'bg-primary/20 border-primary/30' : 'bg-muted border-border'
                }`}>
                  {shortcut}
                </kbd>
                {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
              </div>
            </button>
          )
        })}

        {/* Keyboard shortcuts hint */}
        <div className="mt-6 p-3 bg-muted/30 rounded-lg">
          <div className="text-xs font-medium text-muted-foreground mb-2">Keyboard Shortcuts</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Navigate tabs</span>
              <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+1-8</kbd>
            </div>
            <div className="flex justify-between">
              <span>Quick actions</span>
              <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+K</kbd>
            </div>
            <div className="flex justify-between">
              <span>Refresh data</span>
              <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+R</kbd>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          {breadcrumb.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={index === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>
                {crumb}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden md:flex w-64 flex-shrink-0">
            <div className="w-full bg-card rounded-lg border p-4 sticky top-24">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                Navigation
              </h3>
              <NavigationContent />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Search */}
            <div className="md:hidden mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users, logs, analytics..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-9 pr-4"
                />
              </div>
      </div>

            {/* Tab Content */}
            <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsContent value="overview" className="mt-0">
          <OverviewTab />
        </TabsContent>

                <TabsContent value="users" className="mt-0">
          <UsersTab />
        </TabsContent>

                <TabsContent value="health" className="mt-0">
          <SystemHealthTab />
        </TabsContent>

                <TabsContent value="logs" className="mt-0">
          <LogsTab />
        </TabsContent>

                <TabsContent value="analytics" className="mt-0">
          <APIAnalyticsTab />
        </TabsContent>

                <TabsContent value="integrations" className="mt-0">
          <IntegrationsTab />
        </TabsContent>

                <TabsContent value="database" className="mt-0">
          <DatabaseTab />
        </TabsContent>

                <TabsContent value="debug" className="mt-0">
          <DebuggingToolsTab />
        </TabsContent>
      </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
