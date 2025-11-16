/**
 * Form validation helpers
 */
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords don't match",
    path: ['password_confirm'],
  })

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const subscriptionFormSchema = z.object({
  plan: z.enum(['premium', 'pro'], {
    required_error: 'Please select a plan',
  }),
  billing_cycle: z.enum(['monthly', 'annual'], {
    required_error: 'Please select a billing cycle',
  }),
  trial_enabled: z.boolean().default(true),
  // Payment method is handled separately via Stripe Elements
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>
export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>

