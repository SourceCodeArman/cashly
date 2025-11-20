import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/services/categoryService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import type { CreateCategoryForm } from '@/types'

export function useCategories(parentOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.categories, parentOnly],
    queryFn: async () => {
      const response = await categoryService.listCategories(parentOnly)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch categories')
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCategoryForm) => categoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      toast.success('Category created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category')
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      toast.success('Category deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category')
    },
  })
}

