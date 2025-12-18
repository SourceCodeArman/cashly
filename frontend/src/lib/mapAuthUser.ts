import type { User } from '@/types'
import type { LoginResponse } from '@/services/authService'

type AuthUserLike = LoginResponse['user'] & {
  first_name?: string | null
  last_name?: string | null
  firstName?: string | null
  lastName?: string | null
  is_admin?: boolean | null
  isAdmin?: boolean | null
  is_superuser?: boolean | null
  isSuperuser?: boolean | null
  subscription?: User['subscription']
}

export const mapAuthUser = (user: AuthUserLike): User => ({
  id: String(user.id),
  email: user.email,
  firstName: user.first_name ?? user.firstName ?? '',
  lastName: user.last_name ?? user.lastName ?? '',
  isAdmin: Boolean(user.is_admin ?? user.isAdmin ?? false),
  isSuperuser: Boolean(user.is_superuser ?? user.isSuperuser ?? false),
  subscription: user.subscription,
})


