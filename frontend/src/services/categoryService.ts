/**
 * Category service
 */
import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'
import type { Category } from '@/types/category.types'

export const categoryService = {
  /**
   * Get categories with optional filtering
   * Handles pagination to fetch all categories
   */
  async getCategories(filters?: { type?: 'income' | 'expense' | 'transfer' }): Promise<ApiResponse<Category[]>> {
    const params = new URLSearchParams()
    
    if (filters?.type) {
      params.append('type', filters.type)
    }
    
    const queryString = params.toString()
    const baseUrl = queryString 
      ? `/transactions/categories/?${queryString}`
      : '/transactions/categories/'
    
    // Fetch first page
    const response = await api.get<PaginatedResponse<Category>>(baseUrl)
    const data = response.data as unknown
    
    // Handle paginated response from DRF
    if (typeof data === 'object' && data !== null && 'results' in (data as Record<string, unknown>)) {
      const paginatedData = data as PaginatedResponse<Category>
      let allCategories = [...paginatedData.results]
      
      // Fetch remaining pages if there are more
      let nextUrl = paginatedData.next
      while (nextUrl) {
        try {
          // Extract the path from the full URL (remove domain, keep path + query)
          const url = new URL(nextUrl)
          const pathWithQuery = url.pathname + url.search
          
          const nextResponse = await api.get<PaginatedResponse<Category>>(pathWithQuery)
          const nextData = nextResponse.data as unknown
          
          if (typeof nextData === 'object' && nextData !== null && 'results' in (nextData as Record<string, unknown>)) {
            const nextPaginated = nextData as PaginatedResponse<Category>
            allCategories = [...allCategories, ...nextPaginated.results]
            nextUrl = nextPaginated.next
          } else {
            break
          }
        } catch (error) {
          console.error('Error fetching additional category pages:', error)
          break
        }
      }
      
      return {
        status: 'success',
        data: allCategories,
        message: 'OK',
      }
    }
    
    // If already wrapped in ApiResponse (shouldn't happen with DRF, but handle it)
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      const apiResponse = data as ApiResponse<Category[]>
      return apiResponse
    }
    
    // Fallback: if it's an array (shouldn't happen with pagination enabled)
    if (Array.isArray(data)) {
      return {
        status: 'success',
        data: data as Category[],
        message: 'OK',
      }
    }
    
    return {
      status: 'error',
      data: [],
      message: 'Unexpected categories response format',
    }
  },

  /**
   * Get category by ID
   */
  async getCategory(categoryId: string): Promise<ApiResponse<Category>> {
    const response = await api.get<ApiResponse<Category> | Category>(
      `/transactions/categories/${categoryId}/`
    )
    const data = response.data as unknown
    
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<Category>
    }
    
    if (typeof data === 'object' && data !== null) {
      return {
        status: 'success',
        data: data as Category,
        message: 'OK',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Category,
      message: 'Unexpected category response format',
    }
  },
}

