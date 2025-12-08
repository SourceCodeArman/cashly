import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/Header'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const { isAuthenticated, isSuperuser, user } = useAuthStore()

  // Check both the store's isSuperuser flag and the user object
  const hasAdminAccess = isAuthenticated && (isSuperuser || user?.isSuperuser)

  useEffect(() => {
    if (!hasAdminAccess) {
      navigate('/dashboard', { replace: true })
    }
  }, [hasAdminAccess, navigate])

  if (!hasAdminAccess) {
    return null
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header variant="admin" />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
