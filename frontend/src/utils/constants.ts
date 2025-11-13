/**
 * Application constants
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
export const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1'
export const API_URL = `${API_BASE_URL}/api/${API_VERSION}`

export const REFRESH_INTERVAL = 30000 // 30 seconds

export const TOKEN_STORAGE_KEY = 'cashly_tokens'
export const USER_STORAGE_KEY = 'cashly_user'

export const DATE_FORMAT = 'yyyy-MM-dd'
export const DATE_DISPLAY_FORMAT = 'MMM dd, yyyy'
export const DATETIME_DISPLAY_FORMAT = 'MMM dd, yyyy HH:mm'

export const TRANSACTION_PAGE_SIZE = 20
export const DASHBOARD_RECENT_TRANSACTIONS_LIMIT = 15

export const TOUCH_TARGET_MIN_SIZE = 44 // pixels

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
}

