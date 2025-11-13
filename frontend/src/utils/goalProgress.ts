/**
 * Goal progress calculation utility
 */
import type { Goal } from '@/types/goal.types'
import { transactionService } from '@/services/transactionService'

/**
 * Compute goal progress from manual contributions or inferred category transactions.
 * Prioritizes backend-calculated progress if available, otherwise calculates client-side.
 * Backend provides progress_percentage, manual_contributions_total, and automatic contributions.
 */
export async function computeGoalProgress(
  goal: Goal,
  opts?: { from?: string; to?: string }
): Promise<number> {
  const target = Number(goal.target_amount)
  if (!target || target <= 0) return 0

  // Priority 1: Use backend-provided progress_percentage (most accurate)
  // Backend calculates this from all contributions (manual + automatic)
  if (goal.progress_percentage !== undefined && goal.progress_percentage !== null) {
    return Math.min(100, Math.max(0, goal.progress_percentage))
  }

  // Priority 2: Use backend-provided current_amount
  // This is synced from all contributions
  const current = Number(goal.current_amount)
  if (current > 0) {
    const pct = (current / target) * 100
    return Math.min(100, Math.max(0, pct))
  }

  // Priority 3: Calculate from manual contributions if available
  if (goal.manual_contributions_total && goal.manual_contributions_total > 0) {
    const pct = (goal.manual_contributions_total / target) * 100
    return Math.min(100, Math.max(0, pct))
  }

  // Priority 4: Fallback to inferred category transactions
  // This is for legacy support or when contributions haven't been synced yet
  if (goal.inferred_category_id) {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
    const from = opts?.from || yearStart
    const to = opts?.to || now.toISOString().slice(0, 10)
    
    try {
      const resp = await transactionService.getCategorySum({
        categoryId: goal.inferred_category_id,
        from,
        to,
      })
      if (resp.status === 'success' && resp.data) {
        // Only count positive transactions (income) as contributions
        const total = Math.max(0, resp.data.total || 0)
        const pct = (total / target) * 100
        return Math.min(100, Math.max(0, pct))
      }
    } catch (error) {
      console.error('Error computing goal progress from transactions:', error)
    }
  }

  // Default: no progress
  return 0
}
