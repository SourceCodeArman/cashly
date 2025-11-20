import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserManagementTable } from '@/components/admin/UserManagementTable'
import { UserDetailView } from '@/components/admin/UserDetailView'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { adminService } from '@/services/adminService'
import { toast } from 'sonner'

export function UsersTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const pageSize = 10

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminService.getUsers(page, pageSize, search),
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

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">User Management</h2>
        <p className="text-muted-foreground">Manage user accounts and view detailed information</p>
      </div>

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
      />

      {/* User Details Modal */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
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

