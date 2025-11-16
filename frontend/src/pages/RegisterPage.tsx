/**
 * Register page
 */
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authStore } from '@/store/authStore'
import RegisterForm from '@/components/auth/RegisterForm'
import Card from '@/components/common/Card'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const plan = searchParams.get('plan')

  // Store the selected plan in localStorage for use after registration
  useEffect(() => {
    if (plan) {
      localStorage.setItem('selectedPlan', plan)
    }
  }, [plan])

  // Note: Navigation is handled by useAuth hook after successful registration
  // We just store the plan here for useAuth to pick up

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cashly</h1>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>
        <Card>
          <RegisterForm />
        </Card>
      </div>
    </div>
  )
}

