import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { AppSidebar } from '@/components/AppSidebar'
import { Header } from '@/components/Header'
import { useUIStore } from '@/store/uiStore'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { sidebarOpen } = useUIStore()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-500 ease-in-out"
        style={{ marginLeft: sidebarOpen ? '240px' : '56px' }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

