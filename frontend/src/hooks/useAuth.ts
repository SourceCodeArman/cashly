import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { user, isAuthenticated, accessToken } = useAuthStore()
  return { user, isAuthenticated, accessToken }
}

export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true })
    }
  }, [isAuthenticated, navigate, location])

  return { isAuthenticated }
}

export function useRequireAdmin() {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated || !user?.isSuperuser) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  return { isAuthenticated: isAuthenticated && user?.isSuperuser, isAdmin: user?.isSuperuser }
}

