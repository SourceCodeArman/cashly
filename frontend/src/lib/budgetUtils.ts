/**
 * Utility functions for budget period calculations and formatting
 */

export type PeriodType = 'weekly' | 'monthly' | 'yearly' | 'custom'

/**
 * Calculate period end date based on period type and start date
 */
export function calculatePeriodEnd(periodType: PeriodType, startDate: Date): Date {
  const endDate = new Date(startDate)

  switch (periodType) {
    case 'weekly':
      endDate.setDate(endDate.getDate() + 6) // 7 days total (start + 6 more)
      break
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(endDate.getDate() - 1) // Last day of the month
      break
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1)
      endDate.setDate(endDate.getDate() - 1) // Last day of the year
      break
    case 'custom':
      // For custom periods, return the start date (end date is set manually)
      return endDate
  }

  return endDate
}

/**
 * Calculate period dates (start and end) based on period type
 * If startDate is not provided, uses today as the start date
 */
export function calculatePeriodDates(
  periodType: PeriodType,
  startDate?: Date
): { periodStart: Date; periodEnd: Date } {
  const periodStart = startDate ? new Date(startDate) : new Date()
  const periodEnd = calculatePeriodEnd(periodType, periodStart)

  return { periodStart, periodEnd }
}

/**
 * Format period type for display
 */
export function formatPeriodType(periodType: PeriodType): string {
  return periodType.charAt(0).toUpperCase() + periodType.slice(1)
}

/**
 * Check if period type supports auto-calculation
 */
export function isAutoCalculatedPeriod(periodType: PeriodType): boolean {
  return periodType !== 'custom'
}

/**
 * Check if current date is within the budget period
 */
export function isPeriodActive(periodStart: string, periodEnd: string): boolean {
  const now = new Date()
  const start = new Date(periodStart)
  const end = new Date(periodEnd)

  return now >= start && now <= end
}

/**
 * Format date to ISO string (YYYY-MM-DD) for API
 * Uses local date to avoid timezone issues
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

