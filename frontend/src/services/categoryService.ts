import apiClient from './apiClient'
import type { ApiResponse, Category, CreateCategoryForm } from '@/types'

interface RawCategoryData {
  id?: string
  category_id?: string
  name?: string
  icon?: string
  color?: string
  type?: 'income' | 'expense' | 'transfer'
  isSystemCategory?: boolean
  is_system_category?: boolean
  parent_category?: RawCategoryData | null
  parent_category_name?: string
  parentCategoryName?: string
  subcategories?: RawCategoryData[]
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  [key: string]: unknown
}


const normalizeCategory = (category: RawCategoryData): Category => ({
  id: category.id ?? category.category_id ?? '',
  name: category.name ?? '',
  icon: category.icon,
  color: category.color,
  type: (category.type ?? 'expense') as 'income' | 'expense' | 'transfer',
  isSystemCategory: category.isSystemCategory ?? category.is_system_category ?? false,
  parentCategoryName: category.parent_category_name ?? category.parentCategoryName,
  parent_category: category.parent_category ? normalizeCategory(category.parent_category) : undefined,
  subcategories: category.subcategories?.map(normalizeCategory),
  createdAt: category.created_at ?? category.createdAt,
  updatedAt: category.updated_at ?? category.updatedAt,
})

export const categoryService = {
  async listCategories(parentOnly = false): Promise<ApiResponse<Category[]>> {
    const params = parentOnly ? { parent_only: 'true' } : {}
    const response = await apiClient.get<ApiResponse<Category[]>>('/transactions/categories/', { params })
    if (response.data.status === 'success' && Array.isArray(response.data.data)) {
      response.data.data = response.data.data.map((cat) =>
        normalizeCategory(cat as unknown as RawCategoryData)
      )
    }
    return response.data
  },

  async createCategory(data: CreateCategoryForm): Promise<ApiResponse<Category>> {
    const response = await apiClient.post<ApiResponse<Category>>('/transactions/categories/', data)
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeCategory(response.data.data as unknown as RawCategoryData)
    }
    return response.data
  },

  async updateCategory(id: string, data: Partial<CreateCategoryForm>): Promise<ApiResponse<Category>> {
    const response = await apiClient.patch<ApiResponse<Category>>(
      `/transactions/categories/${id}/`,
      data
    )
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeCategory(response.data.data as unknown as RawCategoryData)
    }
    return response.data
  },

  async deleteCategory(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/transactions/categories/${id}/`)
    return response.data
  },

  async updateCategoryRules(
    id: string,
    rules: import('@/types').CategoryRule[],
    combination?: 'AND' | 'OR'
  ): Promise<ApiResponse<Category>> {
    const response = await apiClient.patch<ApiResponse<Category>>(
      `/transactions/categories/${id}/rules/`,
      { rules, rules_combination: combination || 'OR' }
    )
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeCategory(response.data.data as unknown as RawCategoryData)
    }
    return response.data
  },

  async applyCategoryRules(id: string, overwrite = false): Promise<ApiResponse<{ updated_count: number; category_id: string; category_name: string }>> {
    const params = overwrite ? { overwrite: 'true' } : {}
    const response = await apiClient.post<ApiResponse<{ updated_count: number; category_id: string; category_name: string }>>(
      `/transactions/categories/${id}/apply-rules/`,
      {},
      { params }
    )
    return response.data
  },
}

