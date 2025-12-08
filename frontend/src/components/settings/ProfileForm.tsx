import { useState } from 'react'
import { Save, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phoneNumber: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const emailChangeSchema = z.object({
    newEmail: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

type EmailChangeValues = z.infer<typeof emailChangeSchema>

export function ProfileForm() {
    const { user } = useAuth()
    const { setUser } = useAuthStore()
    const queryClient = useQueryClient()
    const [isLoading, setIsLoading] = useState(false)
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
    const [isEmailLoading, setIsEmailLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phoneNumber: (user as any)?.phoneNumber || '',
        },
    })

    const {
        register: registerEmail,
        handleSubmit: handleSubmitEmail,
        formState: { errors: emailErrors },
        reset: resetEmailForm,
    } = useForm<EmailChangeValues>({
        resolver: zodResolver(emailChangeSchema),
    })

    const onSubmit = async (data: ProfileFormValues) => {
        setIsLoading(true)
        try {
            const response = await authService.updateProfile(data)
            if (response.status === 'success' && response.data) {
                setUser(response.data)
                queryClient.invalidateQueries({ queryKey: queryKeys.profile })
                toast.success('Profile updated successfully')
            } else {
                toast.error(response.message || 'Failed to update profile')
            }
        } catch (error) {
            toast.error('An error occurred. Please try again.')
            console.error('Update profile error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const onEmailSubmit = async (data: EmailChangeValues) => {
        setIsEmailLoading(true)
        try {
            const response = await authService.requestEmailChange({
                new_email: data.newEmail,
                password: data.password,
            })

            if (response.status === 'success') {
                toast.success('Verification email sent. Please check your inbox.')
                setIsEmailDialogOpen(false)
                resetEmailForm()

                // If we got a token back (dev mode), show it
                if (response.data?.token) {
                    console.log('Email verification token:', response.data.token)
                    // In a real app we wouldn't do this, but for dev it helps
                    // toast.info(`Dev Token: ${response.data.token}`)
                }
            } else {
                toast.error(response.message || 'Failed to request email change')
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred. Please try again.')
        } finally {
            setIsEmailLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            {...register('firstName')}
                            disabled={isLoading}
                        />
                        {errors.firstName && (
                            <p className="text-sm text-destructive">{errors.firstName.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            {...register('lastName')}
                            disabled={isLoading}
                        />
                        {errors.lastName && (
                            <p className="text-sm text-destructive">{errors.lastName.message}</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="flex gap-2">
                            <Input
                                id="email"
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="bg-muted"
                            />
                            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" title="Change Email">
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Change Email Address</DialogTitle>
                                        <DialogDescription>
                                            Enter your new email address and current password to request a change.
                                            A verification link will be sent to the new email.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="newEmail">New Email Address</Label>
                                            <Input
                                                id="newEmail"
                                                type="email"
                                                {...registerEmail('newEmail')}
                                                disabled={isEmailLoading}
                                            />
                                            {emailErrors.newEmail && (
                                                <p className="text-sm text-destructive">{emailErrors.newEmail.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Current Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                {...registerEmail('password')}
                                                disabled={isEmailLoading}
                                            />
                                            {emailErrors.password && (
                                                <p className="text-sm text-destructive">{emailErrors.password.message}</p>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isEmailLoading}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isEmailLoading}>
                                                {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Send Verification
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Email change requires verification.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                            id="phoneNumber"
                            type="tel"
                            {...register('phoneNumber')}
                            disabled={isLoading}
                            placeholder="+1 (555) 000-0000"
                        />
                        {errors.phoneNumber && (
                            <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                        )}
                    </div>
                </div>

                <Button type="submit" disabled={isLoading} className="bg-gradient-primary">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </form>
        </div>
    )
}
