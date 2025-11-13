/**
 * Categories hook
 */
import { useQuery } from '@tanstack/react-query'
import { categoryService } from '@/services/categoryService'
import type { Category } from '@/types/category.types'

export function useCategories(type?: 'income' | 'expense' | 'transfer') {
  const {
    data: categoriesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['categories', type],
    queryFn: async () => {
      const response = await categoryService.getCategories(type ? { type } : undefined)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      // Don't throw error if we get empty array - that's valid
      if (response.status === 'error' && !response.data) {
        throw new Error(response.message || 'Failed to fetch categories')
      }
      return response.data || []
    },
    staleTime: 300000, // 5 minutes
    retry: 1, // Only retry once
  })

  return {
    categories: categoriesData || [],
    isLoading,
    error: error || null,
    refetch,
  }
}

