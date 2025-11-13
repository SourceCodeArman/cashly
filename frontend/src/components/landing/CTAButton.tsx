/**
 * CTA Button with conditional behavior:
 * - Not authenticated → Sign up
 * - Authenticated, no accounts → Connect bank
 * - Authenticated, has accounts → Go to dashboard
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'

export default function CTAButton() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // Only fetch accounts when authenticated to avoid 401s on public landing
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['landing', 'accounts-lite'],
    queryFn: async () => {
      const res = await accountService.getAccounts()
      return res.status === 'success' ? res.data ?? [] : []
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30000,
  })

  const hasNoAccounts =
    isAuthenticated && !isLoadingAccounts && Array.isArray(accountsData) && accountsData.length === 0

  const label = !isAuthenticated
    ? 'Sign up for free'
    : hasNoAccounts
      ? 'Connect your bank'
      : 'Go to dashboard'

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/register')
      return
    }
    if (hasNoAccounts) {
      navigate('/accounts?connect=1')
      return
    }
    navigate('/dashboard')
  }

  return (
    <button
      onClick={handleClick}
      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
    >
      {label}
    </button>
  )
}


