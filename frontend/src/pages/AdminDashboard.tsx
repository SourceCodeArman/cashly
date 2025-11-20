import { useState } from 'react'
import { Shield, LayoutDashboard, Users, Heart, FileText, BarChart3, Link2, Database, Wrench } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewTab } from '@/components/admin/tabs/OverviewTab'
import { UsersTab } from '@/components/admin/tabs/UsersTab'
import { SystemHealthTab } from '@/components/admin/tabs/SystemHealthTab'
import { LogsTab } from '@/components/admin/tabs/LogsTab'
import { APIAnalyticsTab } from '@/components/admin/tabs/APIAnalyticsTab'
import { IntegrationsTab } from '@/components/admin/tabs/IntegrationsTab'
import { DatabaseTab } from '@/components/admin/tabs/DatabaseTab'
import { DebuggingToolsTab } from '@/components/admin/tabs/DebuggingToolsTab'

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive system management, monitoring, and debugging tools
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Database</span>
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Debug</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <SystemHealthTab />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogsTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <APIAnalyticsTab />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="database" className="mt-6">
          <DatabaseTab />
        </TabsContent>

        <TabsContent value="debug" className="mt-6">
          <DebuggingToolsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
