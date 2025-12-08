import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/authService'

const passwordChangeSchema = z
    .object({
        old_password: z.string().min(1, 'Current password is required'),
        new_password: z.string().min(8, 'Password must be at least 8 characters'),
        new_password_confirm: z.string().min(1, 'Please confirm your new password'),
    })
    .refine((data) => data.new_password === data.new_password_confirm, {
        message: "Passwords don't match",
        path: ['new_password_confirm'],
    })

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>

export function PasswordChangeForm() {
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PasswordChangeFormValues>({
        resolver: zodResolver(passwordChangeSchema),
    })

    const onSubmit = async (data: PasswordChangeFormValues) => {
        setIsLoading(true)
        try {
            const response = await authService.changePassword(data)
            if (response.status === 'success') {
                toast.success('Password changed successfully')
                reset()
            } else {
                toast.error(response.message || 'Failed to change password')
            }
        } catch (error: any) {
            console.error('Password change error:', error)
            // Handle specific error messages from backend if available
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.errors?.old_password?.[0] ||
                'An error occurred. Please check your current password and try again.'
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="old_password">Current Password</Label>
                <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="old_password"
                        type="password"
                        className="pl-9"
                        {...register('old_password')}
                        disabled={isLoading}
                    />
                </div>
                {errors.old_password && (
                    <p className="text-sm text-destructive">{errors.old_password.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="new_password"
                        type="password"
                        className="pl-9"
                        {...register('new_password')}
                        disabled={isLoading}
                    />
                </div>
                {errors.new_password && (
                    <p className="text-sm text-destructive">{errors.new_password.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="new_password_confirm">Confirm New Password</Label>
                <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="new_password_confirm"
                        type="password"
                        className="pl-9"
                        {...register('new_password_confirm')}
                        disabled={isLoading}
                    />
                </div>
                {errors.new_password_confirm && (
                    <p className="text-sm text-destructive">
                        {errors.new_password_confirm.message}
                    </p>
                )}
            </div>

            <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing Password...
                    </>
                ) : (
                    'Change Password'
                )}
            </Button>
        </form>
    )
}
