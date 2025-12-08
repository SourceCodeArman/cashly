import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserManagementTable } from '@/components/admin/UserManagementTable'
import { UserDetailView } from '@/components/admin/UserDetailView'
import { AdvancedSearchFilter, type SearchFilter, type SavedSearch } from '@/components/admin/AdvancedSearchFilter'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { adminService } from '@/services/adminService'
import { toast } from 'sonner'

export function UsersTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const queryClient = useQueryClient()
  const pageSize = 10

  // Advanced filters
  const [filters, setFilters] = useState<SearchFilter[]>([
    {
      id: 'subscription_tier',
      label: 'Subscription Tier',
      type: 'select',
      value: '',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
        { value: 'premium', label: 'Premium' },
      ]
    },
    {
      id: 'is_active',
      label: 'Active Users Only',
      type: 'boolean',
      value: undefined
    },
    {
      id: 'is_superuser',
      label: 'Include Admin Users',
      type: 'boolean',
      value: false // Default to false to exclude admin users
    },
    {
      id: 'created_after',
      label: 'Created After',
      type: 'date',
      value: ''
    },
    {
      id: 'last_login_after',
      label: 'Last Login After',
      type: 'date',
      value: ''
    },
    {
      id: 'min_balance',
      label: 'Minimum Balance',
      type: 'number',
      value: '',
      placeholder: 'Enter amount'
    }
  ])

  // Build query parameters from filters
  const buildQueryParams = () => {
    const params: any = {
      search: search || undefined,
      page,
      page_size: pageSize,
    }

    filters.forEach(filter => {
      if (filter.value !== '' && filter.value !== null && filter.value !== undefined) {
        if (filter.type === 'boolean') {
          params[filter.id] = filter.value
        } else if (filter.type === 'date') {
          params[filter.id] = filter.value
        } else if (filter.type === 'number') {
          params[filter.id] = filter.value
        } else {
          params[filter.id] = filter.value
        }
      }
    })

    return params
  }

  // Fetch users with advanced filtering
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, filters],
    queryFn: () => {
      const params = buildQueryParams()
      return adminService.getUsers(params.page, params.page_size, params.search, params)
    },
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete user')
    }
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      await Promise.all(userIds.map(id => adminService.deleteUser(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Users deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete some users')
    }
  })

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }

  const handleFiltersChange = (newFilters: SearchFilter[]) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page on filter change
  }

  const handleSaveSearch = (name: string, searchFilters: SearchFilter[]) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters: searchFilters,
      createdAt: new Date()
    }
    const updatedSearches = [...savedSearches, newSearch]
    setSavedSearches(updatedSearches)
    localStorage.setItem('admin-user-searches', JSON.stringify(updatedSearches))
    toast.success(`Search "${name}" saved`)
  }

  const handleLoadSearch = (search: SavedSearch) => {
    setFilters(search.filters)
    setSearch('')
    setPage(1)
    toast.success(`Loaded search "${search.name}"`)
  }

  const handleDeleteSearch = (searchId: string) => {
    const updatedSearches = savedSearches.filter(s => s.id !== searchId)
    setSavedSearches(updatedSearches)
    localStorage.setItem('admin-user-searches', JSON.stringify(updatedSearches))
    toast.success('Saved search deleted')
  }

  // Load saved searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin-user-searches')
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load saved searches:', error)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground text-lg">Manage user accounts, subscriptions, and permissions</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {usersData?.count ? `${usersData.count.toLocaleString()} total users` : ''}
        </div>
      </div>

      {/* Advanced Search & Filters */}
      <AdvancedSearchFilter
        searchTerm={search}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        savedSearches={savedSearches}
        onSaveSearch={handleSaveSearch}
        onLoadSearch={handleLoadSearch}
        onDeleteSearch={handleDeleteSearch}
        placeholder="Search by name, email, or user ID..."
      />

      <UserManagementTable
        users={usersData?.results || []}
        isLoading={usersLoading}
        totalCount={usersData?.count || 0}
        page={page}
        pageSize={pageSize}
        search={search}
        onPageChange={setPage}
        onSearchChange={handleSearchChange}
        onViewDetails={setSelectedUserId}
        onDeleteUser={(id) => deleteMutation.mutate(id)}
        onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
      />

      {/* User Details Modal */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-6xl h-[95vh] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          {selectedUserId && (
            <UserDetailView
              userId={selectedUserId}
              onClose={() => setSelectedUserId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

