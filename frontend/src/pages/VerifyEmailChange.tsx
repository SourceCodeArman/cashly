import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authService } from '@/services/authService'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

export default function VerifyEmailChange() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { setUser } = useAuthStore()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')
    const token = searchParams.get('token')

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setStatus('error')
                setMessage('No verification token provided')
                return
            }

            try {
                const response = await authService.verifyEmailChange(token)

                if (response.status === 'success' && response.data) {
                    setStatus('success')
                    setMessage('Email address updated successfully!')
                    toast.success('Email updated successfully')

                    // Refresh user profile
                    try {
                        const profileResponse = await authService.getProfile()
                        if (profileResponse.status === 'success' && profileResponse.data) {
                            setUser(profileResponse.data)
                        }
                    } catch (error) {
                        console.error('Failed to refresh profile:', error)
                    }

                    // Redirect after 2 seconds
                    setTimeout(() => {
                        navigate('/settings')
                    }, 2000)
                } else {
                    setStatus('error')
                    setMessage(response.message || 'Failed to verify email')
                    toast.error(response.message || 'Failed to verify email')
                }
            } catch (error: any) {
                setStatus('error')
                const errorMessage = error.response?.data?.message || error.message || 'An error occurred'
                setMessage(errorMessage)
                toast.error(errorMessage)
            }
        }

        verifyEmail()
    }, [token, navigate, setUser])

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Email Verification</CardTitle>
                    <CardDescription>
                        We're verifying your new email address
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-16 w-16 text-primary animate-spin" />
                            <p className="text-center text-muted-foreground">
                                Verifying your email address...
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-lg">{message}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Redirecting you to settings...
                                </p>
                            </div>
                            <Button onClick={() => navigate('/settings')} className="w-full">
                                Go to Settings
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="h-16 w-16 text-destructive" />
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-lg">Verification Failed</h3>
                                <p className="text-sm text-muted-foreground">{message}</p>
                            </div>
                            <div className="flex gap-2 w-full">
                                <Button variant="outline" onClick={() => navigate('/settings')} className="flex-1">
                                    Go to Settings
                                </Button>
                                <Button onClick={() => navigate('/')} className="flex-1">
                                    Go Home
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
