import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords don't match",
    path: ['password_confirm'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setTokens } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      // Register the user
      const response = await authService.register({
        email: data.email,
        username: data.username,
        password: data.password,
        password_confirm: data.password_confirm,
        first_name: data.first_name,
        last_name: data.last_name,
      })

      if (response.status === 'success' && response.data) {
        toast.success('Account created successfully! Logging you in...')

        // Auto-login after successful registration
        try {
          const loginResponse = await authService.login({
            email: data.email,
            password: data.password,
          })

          if (loginResponse.status === 'success' && loginResponse.data) {
            const { access, refresh, user } = loginResponse.data
            if (!access || !refresh || !user) {
              toast.error('Invalid login response')
              navigate('/login', { replace: true })
              return
            }

            setTokens(access, refresh)

            // Set user from login response (includes isSuperuser)
            const mappedUser = mapAuthUser(user)
            setUser(mappedUser)

            // Fetch full profile to ensure we have all user data
            try {
              const profileResponse = await authService.getProfile()
              if (profileResponse.status === 'success' && profileResponse.data) {
                setUser(profileResponse.data)
              }
            } catch (profileError) {
              // If profile fetch fails, continue with login user data
              console.warn('Failed to fetch profile after registration:', profileError)
            }

            toast.success('Welcome to Cashly!')

            // Handle redirect query parameter
            const redirectUrl = searchParams.get('redirect')
            if (redirectUrl) {
              navigate(decodeURIComponent(redirectUrl), { replace: true })
            } else {
              // Check if user is admin/superuser and redirect accordingly
              const isAdmin = mappedUser.isSuperuser || mappedUser.isAdmin
              navigate(isAdmin ? '/admin' : '/dashboard', { replace: true })
            }
          }
        } catch (loginError) {
          // Registration succeeded but login failed, redirect to login page
          toast.error('Account created! Please log in to continue.')
          navigate('/login', { replace: true })
          console.error('Auto-login error:', loginError)
        }
      } else {
        toast.error(response.message || 'Registration failed')
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
      console.error('Registration error:', err)
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
        <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
        <CardDescription className="text-center">
          Enter your information to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                type="text"
                placeholder="John"
                {...register('first_name')}
                disabled={isLoading}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                type="text"
                placeholder="Doe"
                {...register('last_name')}
                disabled={isLoading}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
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
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe"
              {...register('username')}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
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
          <div className="space-y-2">
            <Label htmlFor="password_confirm">Confirm Password</Label>
            <div className="relative">
              <Input
                id="password_confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password_confirm')}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password_confirm && (
              <p className="text-sm text-destructive">{errors.password_confirm.message}</p>
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

