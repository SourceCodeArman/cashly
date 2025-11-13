/**
 * Register form component
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { registerSchema, type RegisterFormData } from '@/utils/validators'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterForm() {
  const { register: registerUser, isRegistering } = useAuth()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterFormData) => {
    registerUser(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <Input
        label="Username"
        type="text"
        {...register('username')}
        error={errors.username?.message}
        placeholder="Choose a username"
        autoComplete="username"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          type="text"
          {...register('first_name')}
          error={errors.first_name?.message}
          placeholder="John"
          autoComplete="given-name"
        />

        <Input
          label="Last Name"
          type="text"
          {...register('last_name')}
          error={errors.last_name?.message}
          placeholder="Doe"
          autoComplete="family-name"
        />
      </div>

      <Input
        label="Password"
        type="password"
        {...register('password')}
        error={errors.password?.message}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        helperText="Must be at least 8 characters"
      />

      <Input
        label="Confirm Password"
        type="password"
        {...register('password_confirm')}
        error={errors.password_confirm?.message}
        placeholder="Confirm your password"
        autoComplete="new-password"
      />

      <div className="flex items-start">
        <input
          type="checkbox"
          required
          className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label className="ml-2 text-sm text-gray-600">
          I agree to the{' '}
          <Link to="/terms" className="text-primary-600 hover:text-primary-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary-600 hover:text-primary-700">
            Privacy Policy
          </Link>
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isRegistering}
      >
        Create account
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}

