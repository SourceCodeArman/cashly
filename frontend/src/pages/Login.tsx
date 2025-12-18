import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import type { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card' // We might not strictly need the shadcn card components if we style manually for the theme, but let's stick to theme styles.
// Actually, let's keep using Card but style it to match the theme.
import { authService } from '@/services/authService'
import type { LoginResponse } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'
import { mapAuthUser } from '@/lib/mapAuthUser'
import { formatApiError } from '@/lib/formatApiError'
import { supabase } from '@/utils/supabaseClient'

import { Logo } from '@/components/Logo'

const loginSchema = z.object({
  login: z.string().min(1, 'Email or phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)

  const navigate = useNavigate()
  const { setUser, setTokens } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Handle Supabase OAuth Redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSupabaseExchange(session.access_token)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleSupabaseExchange(session.access_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSupabaseExchange = async (token: string) => {
    // Avoid double-submission if already loading
    // Note: This logic is tricky with strict mode, but essential. 
    // We'll rely on the backend being idempotent-ish or just handling the error gracefully.

    // Ideally we would check if we already have a session in our own store, but we might be logging in.

    try {
      // If we are already processing, skip.
      // But setIsLoading(true) inside useEffect might not be enough due to closures.
      // We'll proceed optimistically.
      const response = await authService.googleLogin(token)
      if (response.status === 'success' && response.data) {
        await handleLoginSuccess(response.data)
        // Sign out from Supabase to keep it clean (we use our own tokens)
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.error("Google Backend Exchange Error", err)
      // Don't show error immediately if it's just a duplicate call, but safe to log.
      // Only show toast if it's not a "cancelled" error
    }
  }

  const handleLoginSuccess = async (data: LoginResponse) => {
    const { access, refresh, user } = data
    if (access && refresh) {
      setTokens(access, refresh)
    }

    if (user) {
      const mappedUser = mapAuthUser(user)
      setUser(mappedUser)

      // Check if user is admin/superuser and redirect accordingly
      const isAdmin = mappedUser.isSuperuser || mappedUser.isAdmin
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true })
    }

    try {
      const profileResponse = await authService.getProfile()
      if (profileResponse.status === 'success' && profileResponse.data) {
        setUser(profileResponse.data)
        console.log('Profile loaded, isSuperuser:', profileResponse.data.isSuperuser)
      }
    } catch (profileError) {
      console.warn('Failed to fetch profile after login:', profileError)
    }

    toast.success('Welcome back!')
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/login',
        }
      })
      if (error) throw error
    } catch (error) {
      console.error(error)
      toast.error('Failed to initiate Google Login')
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const response = await authService.login(data)
      if (response.status === 'success' && response.data) {
        await handleLoginSuccess(response.data)
      } else if (response.status === 'mfa_required' && response.data) {
        setTempToken(response.data.temp_token || '')
        setMfaRequired(true)
      } else {
        toast.error(response.message || 'Login failed')
      }
    } catch (err) {
      handleLoginError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (useBackupCode) {
      if (mfaCode.length < 8) return
    } else {
      if (mfaCode.length !== 6) return
    }

    setIsLoading(true)
    try {
      let response
      if (useBackupCode) {
        response = await authService.verifyBackupCode(mfaCode, tempToken)
      } else {
        response = await authService.verifyMFALogin(mfaCode, tempToken)
      }

      if (response.status === 'success' && response.data) {
        await handleLoginSuccess(response.data)
      } else {
        toast.error(response.message || 'Invalid code')
      }
    } catch (err) {
      handleLoginError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginError = (err: unknown) => {
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

        <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold italic mb-3 text-[#1A1A1A]">
              {mfaRequired ? 'Two-Factor Authentication' : 'Welcome back'}
            </h1>
            <p className="text-[#1A1A1A]/60">
              {mfaRequired ? 'Enter the code from your authenticator app' : 'Sign in to access your dashboard'}
            </p>
          </div>

          {!mfaRequired && (
            <div className="mb-6">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-14 rounded-full border border-[#1A1A1A]/10 bg-white hover:bg-gray-50 text-[#1A1A1A] font-bold flex items-center justify-center gap-3 transition-all"
                disabled={isLoading}
              >
                <svg role="img" viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>
                Continue with Google
              </Button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#1A1A1A]/10"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#FDFCF8] px-2 text-[#1A1A1A]/40">Or</span>
                </div>
              </div>
            </div>
          )}

          {mfaRequired ? (
            <form onSubmit={handleMfaVerify} className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="mfa-code" className="text-sm font-medium">
                    {useBackupCode ? 'Backup Code' : 'Verification Code'}
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode)
                      setMfaCode('')
                    }}
                  >
                    {useBackupCode ? 'Use Authenticator App' : 'Use Backup Code'}
                  </Button>
                </div>
                <Input
                  id="mfa-code"
                  value={mfaCode}
                  onChange={e => {
                    const val = e.target.value.toUpperCase()
                    if (useBackupCode) {
                      setMfaCode(val)
                    } else {
                      if (/^\d*$/.test(val)) setMfaCode(val)
                    }
                  }}
                  placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                  maxLength={useBackupCode ? 9 : 6}
                  className="text-center text-lg tracking-widest h-14 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent"
                  autoFocus
                  disabled={isLoading}
                  autoComplete="one-time-code"
                />
                {useBackupCode && (
                  <p className="text-xs text-[#1A1A1A]/40 text-center">
                    Format: 8 characters (e.g. ABCD-EFGH)
                  </p>
                )}
                {!useBackupCode && import.meta.env.DEV && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full h-auto text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                    onClick={() => setMfaCode('000000')}
                  >
                    Dev Mode: Use Bypass Code (000000)
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-14 rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 text-base font-bold"
                disabled={isLoading || (useBackupCode ? mfaCode.length < 8 : mfaCode.length !== 6)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-transparent"
                onClick={() => setMfaRequired(false)}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login" className="text-sm font-semibold text-[#1A1A1A]">Email or Phone Number</Label>
                  </div>
                  <Input
                    id="login"
                    type="text"
                    placeholder="you@example.com or +1234567890"
                    {...register('login')}
                    disabled={isLoading}
                    className="h-12 rounded-xl border-[#1A1A1A]/10 focus:border-[#1A1A1A] bg-transparent"
                  />
                  {errors.login && (
                    <p className="text-sm text-red-500">{errors.login.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold text-[#1A1A1A]">Password</Label>
                    {/* Placeholder for forgot password if needed later */}
                    {/* <Link to="/forgot-password" class="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A]">Forgot password?</Link> */}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      disabled={isLoading}
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
              </div>
              <Button
                type="submit"
                className="w-full h-14 rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 text-base font-bold shadow-lg shadow-[#1A1A1A]/10"
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

              {/* Removed Or separator as it was moved up */}
            </form>
          )}

          {!mfaRequired && (
            <div className="mt-8 text-center">
              <p className="text-sm text-[#1A1A1A]/60">
                Don't have an account?{' '}
                <Link to="/register" className="text-[#1A1A1A] font-bold hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          )}
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

        <div className="relative z-10 text-center max-w-full">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 w-full text-nowrap">
            Master your money <br />
            <span className="text-[#E3E8D3] italic">#withCashly</span>
          </h2>
          <p className="text-xl text-[#FDFCF8]/60 font-light px-10">
            From budgeting and expense tracking to detailed financial insights, build and automate your path to financial freedom.
          </p>

          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-[#FDFCF8]/40">
            <span>Trusted by 500,000+ Makers</span>
            <span>|</span>
            <span>Free forever</span>
          </div>
        </div>
      </div>
    </div>
  )
}
