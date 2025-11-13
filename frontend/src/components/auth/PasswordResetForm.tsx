/**
 * Password reset form component
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { passwordResetSchema, type PasswordResetFormData } from '@/utils/validators'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'

export default function PasswordResetForm() {
  const { passwordReset, isResettingPassword } = useAuth()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
  })

  const onSubmit = (data: PasswordResetFormData) => {
    passwordReset(data.email)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isResettingPassword}
      >
        Send reset link
      </Button>

      <p className="text-center text-sm text-gray-600">
        Remember your password?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}

