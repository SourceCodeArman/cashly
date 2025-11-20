import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import type { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'
import { mapAuthUser } from '@/lib/mapAuthUser'
import { formatApiError } from '@/lib/formatApiError'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser, setTokens } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const response = await authService.login(data)
      if (response.status === 'success' && response.data) {
        const { access, refresh, user } = response.data
        setTokens(access, refresh)

        // Set user from login response (includes isSuperuser)
        const mappedUser = mapAuthUser(user)
        setUser(mappedUser)

        // Fetch full profile to ensure we have all user data
        // Wait for it to complete before navigating
        try {
          const profileResponse = await authService.getProfile()
          if (profileResponse.status === 'success' && profileResponse.data) {
            setUser(profileResponse.data)
            console.log('Profile loaded, isSuperuser:', profileResponse.data.isSuperuser)
          }
        } catch (profileError) {
          // If profile fetch fails, continue with login user data
          console.warn('Failed to fetch profile after login:', profileError)
        }

        toast.success('Welcome back!')
        navigate('/dashboard', { replace: true })
      } else {
        toast.error(response.message || 'Login failed')
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<unknown>>
      const responseData = axiosError.response?.data
      if (responseData?.data) {
        toast.error(formatApiError(responseData.data))
      } else if (responseData?.message) {
        toast.error(responseData.message)
      } else {
        toast.error('An error occurred. Please try again.')
      }
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-soft">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <img src="/logo.svg" alt="Cashly Logo" className="h-12 w-12" />
        </div>
        <CardTitle className="text-2xl text-center">Welcome to Cashly</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

