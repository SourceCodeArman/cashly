/**
 * Category selector component
 */
import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useCategories'
import Select from '@/components/common/Select'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { Category } from '@/types/category.types'

export interface CategorySelectorProps {
  value?: string
  onChange: (categoryId: string) => void
  type?: 'income' | 'expense' | 'transfer'
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function CategorySelector({
  value,
  onChange,
  type,
  placeholder = 'Select a category',
  disabled = false,
  className,
}: CategorySelectorProps) {
  // Fetch all categories (we'll filter client-side if needed)
  // This ensures we always have categories even if type filtering returns empty
  const { categories: allCategories, isLoading, error } = useCategories()
  
  const [selectedValue, setSelectedValue] = useState(value || '')

  useEffect(() => {
    setSelectedValue(value || '')
  }, [value])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-500">Loading categories...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load categories. Please try again.
      </div>
    )
  }

  if (allCategories.length === 0) {
    return (
      <div className="text-sm text-yellow-600">
        No categories available. Please run: python manage.py create_system_categories
      </div>
    )
  }

  // Filter categories by type if specified, otherwise show all
  const displayCategories = type
    ? allCategories.filter(cat => cat.type === type)
    : allCategories

  const options = displayCategories.map((category) => ({
    value: category.category_id,
    label: category.name,
  }))

  // Add empty option for "No category"
  const allOptions = [
    { value: '', label: 'No category' },
    ...options,
  ]

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value
    setSelectedValue(newValue)
    onChange(newValue)
  }

  return (
    <Select
      value={selectedValue}
      onChange={handleChange}
      options={allOptions}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}

