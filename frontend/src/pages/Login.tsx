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
import type { LoginResponse } from '@/services/authService'
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
    <Card className="border-border shadow-soft">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <img src="/logo.svg" alt="Cashly Logo" className="h-12 w-12" />
        </div>
        <CardTitle className="text-2xl text-center">
          {mfaRequired ? 'Two-Factor Authentication' : 'Welcome to Cashly'}
        </CardTitle>
        <CardDescription className="text-center">
          {mfaRequired ? 'Enter the code from your authenticator app' : 'Sign in to your account to continue'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mfaRequired ? (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="mfa-code">
                  {useBackupCode ? 'Backup Code' : 'Verification Code'}
                </Label>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-xs"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode)
                    setMfaCode('')
                    // Reset errors when switching methods
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
                  // Allow hyphen for backup codes
                  if (useBackupCode) {
                    setMfaCode(val)
                  } else {
                    // Only digits for TOTP
                    if (/^\d*$/.test(val)) setMfaCode(val)
                  }
                }}
                placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                maxLength={useBackupCode ? 9 : 6}
                className="text-center text-lg tracking-widest"
                autoFocus
                disabled={isLoading}
                autoComplete="one-time-code"
              />
              {useBackupCode && (
                <p className="text-xs text-muted-foreground text-center">
                  Format: 8 characters (e.g. ABCD-EFGH)
                </p>
              )}
              {!useBackupCode && import.meta.env.DEV && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1 h-auto text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setMfaCode('000000')}
                >
                  Dev Mode: Use Bypass Code (000000)
                </Button>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={isLoading || (useBackupCode ? mfaCode.length < 8 : mfaCode.length !== 6)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : 'Verify'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setMfaRequired(false)} disabled={isLoading}>
              Back to Login
            </Button>
          </form>
        ) : (
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
        )}
      </CardContent>
      {!mfaRequired && (
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  )
}

