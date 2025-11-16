/**
 * Formatting utility functions
 */
import { format, parseISO } from 'date-fns'
import { DATE_DISPLAY_FORMAT, DATETIME_DISPLAY_FORMAT } from './constants'

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) {
    return '$0.00'
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, formatStr: string = DATE_DISPLAY_FORMAT): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr)
  } catch {
    return date.toString()
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, DATETIME_DISPLAY_FORMAT)
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'just now'
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }
    
    return formatDate(dateObj)
  } catch {
    return date.toString()
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format large numbers (e.g., 1.5K, 2.3M)
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Format account number for display (extracts last 4 digits and formats with dots)
 * Handles formats like "****7777" or "7777" and returns a formatted string with dots
 * Uses periods (.) for consistent baseline alignment across all browsers
 */
export function formatAccountNumber(masked: string | undefined | null): string | null {
  if (!masked) return null
  
  // Extract only digits and take the last 4
  const digits = masked.replace(/\D/g, '')
  const lastFour = digits.slice(-4)
  
  if (!lastFour || lastFour.length !== 4) return null
  
  // Return format: 12 dots + last 4 digits
  // Using middle dot (·) U+00B7 for consistent baseline alignment
  // This character renders at a consistent height across all fonts
  const middleDot = '\u00B7' // Middle dot character
  return `${middleDot.repeat(12)}${lastFour}`
}

/**
 * Format account type for display
 * Converts snake_case to Title Case (e.g., "credit_card" -> "Credit Card")
 */
export function formatAccountType(accountType: string | undefined | null): string | null {
  if (!accountType) return null
  
  // Convert snake_case or kebab-case to Title Case
  return accountType
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Get last 4 digits from a masked account number
 * Extracts and returns only the last 4 digits without formatting
 */
export function getLastFourDigits(masked: string | undefined | null): string | null {
  if (!masked) return null
  
  // Extract only digits and take the last 4
  const digits = masked.replace(/\D/g, '')
  const lastFour = digits.slice(-4)
  
  if (!lastFour || lastFour.length !== 4) return null
  
  return lastFour
}

