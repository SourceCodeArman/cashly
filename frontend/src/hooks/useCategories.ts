import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/services/categoryService'
import { queryKeys } from '@/lib/queryClient'
import type { Category, CreateCategoryForm, CategoryRule } from '@/types'
import { toast } from 'sonner'

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

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryForm> }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      toast.success('Category updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category')
    },
  })
}

export function useUpdateCategoryRules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, rules, combination }: { id: string; rules: CategoryRule[]; combination?: 'AND' | 'OR' }) =>
      categoryService.updateCategoryRules(id, rules, combination),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      toast.success('Category rules updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update category rules')
    },
  })
}

export function useApplyCategoryRules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, overwrite }: { id: string; overwrite?: boolean }) =>
      categoryService.applyCategoryRules(id, overwrite),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })
      const count = data.data?.updated_count || 0
      toast.success(`Applied rules to ${count} transaction${count !== 1 ? 's' : ''}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply category rules')
    },
  })
}
