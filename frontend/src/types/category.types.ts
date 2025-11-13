/**
 * Category types
 */
export interface Category {
  category_id: string
  name: string
  type: 'income' | 'expense' | 'transfer'
  icon?: string
  color: string
  is_system_category: boolean
  parent_category?: string
  parent_category_name?: string
  created_at: string
  updated_at: string
}

export interface CategoryCreateData {
  name: string
  type: 'income' | 'expense' | 'transfer'
  icon?: string
  color?: string
  parent_category?: string
}

