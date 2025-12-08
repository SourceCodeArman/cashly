import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user is admin/superuser and redirect accordingly
      const isAdmin = user.isSuperuser || user.isAdmin
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}

