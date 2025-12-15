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
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'
import { mapAuthUser } from '@/lib/mapAuthUser'
import { formatApiError } from '@/lib/formatApiError'

import { Logo } from '@/components/Logo'

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
    <div className="min-h-screen w-full flex bg-[#FDFCF8]">
      {/* Left Column - Form */}
      <div className="w-full lg:w-[40%] flex flex-col p-6 sm:p-12 relative min-h-screen">
        <div className="flex justify-between items-center mb-8 sm:mb-0">
          <Link to="/" className="inline-flex items-center text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
            Back
          </Link>
        </div>

        <div className="flex-grow flex flex-col justify-center max-w-lg mx-auto w-full my-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold italic mb-3 text-[#1A1A1A]">
              Create an Account
            </h1>
            <p className="text-[#1A1A1A]/60">
              Start your journey to financial freedom
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-semibold text-[#1A1A1A]">First Name</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="John"
                  {...register('first_name')}
                  disabled={isLoading}
                  className="h-12 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent"
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-semibold text-[#1A1A1A]">Last Name</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Doe"
                  {...register('last_name')}
                  disabled={isLoading}
                  className="h-12 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent"
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-[#1A1A1A]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isLoading}
                className="h-12 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-[#1A1A1A]">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                {...register('username')}
                disabled={isLoading}
                className="h-12 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent"
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-[#1A1A1A]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirm" className="text-sm font-semibold text-[#1A1A1A]">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="password_confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password_confirm')}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password_confirm && (
                <p className="text-sm text-red-500">{errors.password_confirm.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 text-base font-bold shadow-lg shadow-[#1A1A1A]/10"
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

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#1A1A1A]/10"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#FDFCF8] px-2 text-[#1A1A1A]/40">Or</span>
              </div>
            </div>
          </form>

          <div className="mt-8 text-center pb-8">
            <p className="text-sm text-[#1A1A1A]/60">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1A1A1A] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="flex-none mt-8 sm:mt-0">
          <p className="text-xs text-[#1A1A1A]/20 text-center">&copy; {new Date().getFullYear()} Cashly. All rights reserved.</p>
        </div>
      </div>

      {/* Right Column - Brand */}
      <div className="hidden lg:flex w-[60%] fixed top-0 right-0 h-screen bg-[#1A1A1A] flex-col justify-center items-center text-[#FDFCF8] p-12 overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E3E8D3]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#E3E8D3]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Logo at Top Right */}
        <div className="absolute top-12 right-12 z-20">
          <Logo variant="light" />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-6 leading-tight">
            Financial clarity <br />
            <span className="text-[#E3E8D3] italic">#withCashly</span>
          </h2>
          <p className="text-xl text-[#FDFCF8]/60 font-light">
            Join thousands of others achieving financial freedom with our advanced tracking and insight tools.
          </p>

          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-[#FDFCF8]/40">
            <span>Smart Money Management</span>
            <span>|</span>
            <span>Join Cashly Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}