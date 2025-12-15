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

  return <>{children}</>
}

