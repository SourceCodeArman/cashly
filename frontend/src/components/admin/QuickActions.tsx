import { useEffect, useState } from 'react'
import {
  Zap,
  RefreshCw,
  Download,
  Upload,
  Search,
  Settings,
  UserPlus,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Command
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
  category: 'common' | 'user' | 'system' | 'data'
  color?: string
}

interface QuickActionsProps {
  actions?: QuickAction[]
  onRefresh?: () => void
  onExport?: () => void
  onImport?: () => void
  className?: string
}

const defaultActions: QuickAction[] = [
  {
    id: 'refresh',
    label: 'Refresh Data',
    description: 'Reload all current data',
    icon: RefreshCw,
    shortcut: 'Ctrl+R',
    action: () => toast.info('Refresh action triggered'),
    category: 'common'
  },
  {
    id: 'export',
    label: 'Export Data',
    description: 'Download current view as CSV',
    icon: Download,
    shortcut: 'Ctrl+E',
    action: () => toast.info('Export action triggered'),
    category: 'data'
  },
  {
    id: 'search',
    label: 'Quick Search',
    description: 'Focus search input',
    icon: Search,
    shortcut: '/',
    action: () => {
      const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
      searchInput?.focus()
    },
    category: 'common'
  },
  {
    id: 'settings',
    label: 'Admin Settings',
    description: 'Open admin configuration',
    icon: Settings,
    shortcut: 'Ctrl+,',
    action: () => toast.info('Settings action triggered'),
    category: 'system'
  }
]

export function QuickActions({
  actions = defaultActions,
  onRefresh,
  onExport,
  onImport,
  className = ""
}: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recentActions, setRecentActions] = useState<string[]>([])

  // Merge provided actions with defaults
  const allActions = [...actions]

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command palette shortcut (Ctrl+K or Cmd+K)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        return
      }

      // Individual shortcuts
      allActions.forEach(action => {
        if (!action.shortcut) return

        const keys = action.shortcut.toLowerCase().split('+')
        const ctrlRequired = keys.includes('ctrl')
        const altRequired = keys.includes('alt')
        const shiftRequired = keys.includes('shift')
        const metaRequired = keys.includes('cmd') || keys.includes('meta')
        const key = keys[keys.length - 1]

        const ctrlPressed = event.ctrlKey || event.metaKey
        const altPressed = event.altKey
        const shiftPressed = event.shiftKey

        if (
          (ctrlRequired === ctrlPressed) &&
          (altRequired === altPressed) &&
          (shiftRequired === shiftPressed) &&
          event.key.toLowerCase() === key
        ) {
          event.preventDefault()
          action.action()
          setRecentActions(prev => [action.id, ...prev.slice(0, 4)])
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [allActions])

  const handleActionClick = (action: QuickAction) => {
    action.action()
    setRecentActions(prev => [action.id, ...prev.slice(0, 4)])
    setIsOpen(false)
  }

  const categories = {
    common: { label: 'Common Actions', color: 'blue' },
    user: { label: 'User Management', color: 'green' },
    system: { label: 'System Tools', color: 'orange' },
    data: { label: 'Data Operations', color: 'purple' }
  }

  const groupedActions = allActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = []
    }
    acc[action.category].push(action)
    return acc
  }, {} as Record<string, QuickAction[]>)

  return (
    <>
      {/* Quick Actions Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Zap className="h-4 w-4 mr-2" />
            Quick Actions
            <Badge variant="secondary" className="ml-2 text-xs">
              <Command className="h-3 w-3 mr-1" />
              K
            </Badge>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
              <Badge variant="outline" className="text-xs">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> to open
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Recent Actions */}
              {recentActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent</h3>
                  <div className="grid gap-2">
                    {recentActions.slice(0, 3).map(actionId => {
                      const action = allActions.find(a => a.id === actionId)
                      if (!action) return null

                      const Icon = action.icon
                      return (
                        <Button
                          key={actionId}
                          variant="ghost"
                          className="justify-start h-auto p-3"
                          onClick={() => handleActionClick(action)}
                        >
                          <Icon className="h-4 w-4 mr-3 text-muted-foreground" />
                          <div className="text-left">
                            <div className="font-medium">{action.label}</div>
                            <div className="text-xs text-muted-foreground">{action.description}</div>
                          </div>
                          {action.shortcut && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              {action.shortcut}
                            </Badge>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                  <Separator className="my-4" />
                </div>
              )}

              {/* Categorized Actions */}
              {Object.entries(groupedActions).map(([category, categoryActions]) => {
                const categoryInfo = categories[category as keyof typeof categories]
                if (!categoryInfo) return null

                return (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                      {categoryInfo.label}
                    </h3>
                    <div className="grid gap-2">
                      {categoryActions.map(action => {
                        const Icon = action.icon
                        return (
                          <Button
                            key={action.id}
                            variant="ghost"
                            className="justify-start h-auto p-3 hover:bg-muted/50"
                            onClick={() => handleActionClick(action)}
                          >
                            <Icon className={`h-4 w-4 mr-3 text-${categoryInfo.color}-600`} />
                            <div className="text-left flex-1">
                              <div className="font-medium">{action.label}</div>
                              <div className="text-xs text-muted-foreground">{action.description}</div>
                            </div>
                            {action.shortcut && (
                              <Badge variant="outline" className="text-xs">
                                {action.shortcut}
                              </Badge>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Footer with keyboard shortcuts hint */}
          <div className="border-t pt-4">
            <div className="text-xs text-muted-foreground text-center">
              <div className="flex items-center justify-center gap-4">
                <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> Open palette</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">/</kbd> Focus search</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+R</kbd> Refresh</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Hook for managing keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      Object.entries(shortcuts).forEach(([keyCombo, action]) => {
        const keys = keyCombo.toLowerCase().split('+')
        const ctrlRequired = keys.includes('ctrl')
        const altRequired = keys.includes('alt')
        const shiftRequired = keys.includes('shift')
        const metaRequired = keys.includes('cmd') || keys.includes('meta')
        const key = keys[keys.length - 1]

        const ctrlPressed = event.ctrlKey || event.metaKey
        const altPressed = event.altKey
        const shiftPressed = event.shiftKey

        if (
          (ctrlRequired === ctrlPressed) &&
          (altRequired === altPressed) &&
          (shiftRequired === shiftPressed) &&
          event.key.toLowerCase() === key
        ) {
          event.preventDefault()
          action()
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// Toast notifications for shortcuts
export function showShortcutHint(shortcut: string, description: string) {
  toast(`Press ${shortcut} to ${description}`, {
    duration: 2000,
  })
}
