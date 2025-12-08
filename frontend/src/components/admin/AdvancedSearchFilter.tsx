import { useState } from 'react'
import {
  Search,
  X,
  ChevronDown,
  Save,
  Bookmark,
  SlidersHorizontal
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DatePicker } from '@/components/ui/date-picker'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export interface SearchFilter {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'daterange' | 'boolean' | 'number'
  value: any
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface SavedSearch {
  id: string
  name: string
  filters: SearchFilter[]
  createdAt: Date
}

interface AdvancedSearchFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filters: SearchFilter[]
  onFiltersChange: (filters: SearchFilter[]) => void
  savedSearches?: SavedSearch[]
  onSaveSearch?: (name: string, filters: SearchFilter[]) => void
  onLoadSearch?: (search: SavedSearch) => void
  onDeleteSearch?: (searchId: string) => void
  placeholder?: string
  showFilters?: boolean
  className?: string
}

export function AdvancedSearchFilter({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  savedSearches = [],
  onSaveSearch,
  onLoadSearch,
  onDeleteSearch,
  placeholder = "Search...",
  showFilters = true,
  className = ""
}: AdvancedSearchFilterProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const activeFilters = filters.filter(filter => {
    if (filter.type === 'daterange') {
      return filter.value?.start || filter.value?.end
    }
    if (filter.type === 'boolean') {
      return filter.value !== undefined
    }
    return filter.value !== '' && filter.value !== null && filter.value !== undefined
  })

  const updateFilter = (filterId: string, value: any) => {
    const updatedFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, value } : filter
    )
    onFiltersChange(updatedFilters)
  }

  const clearFilter = (filterId: string) => {
    const updatedFilters = filters.map(filter =>
      filter.id === filterId
        ? filter.type === 'daterange'
          ? { ...filter, value: { start: undefined, end: undefined } }
          : { ...filter, value: filter.type === 'boolean' ? undefined : '' }
        : filter
    )
    onFiltersChange(updatedFilters)
  }

  const clearAllFilters = () => {
    const clearedFilters = filters.map(filter =>
      filter.type === 'daterange'
        ? { ...filter, value: { start: undefined, end: undefined } }
        : { ...filter, value: filter.type === 'boolean' ? undefined : '' }
    )
    onFiltersChange(clearedFilters)
  }

  const handleSaveSearch = () => {
    if (saveSearchName.trim() && onSaveSearch) {
      const activeFiltersOnly = filters.filter(f => {
        if (f.type === 'daterange') return f.value?.start || f.value?.end
        if (f.type === 'boolean') return f.value !== undefined
        return f.value !== '' && f.value !== null && f.value !== undefined
      })
      onSaveSearch(saveSearchName.trim(), activeFiltersOnly)
      setSaveSearchName('')
      setShowSaveDialog(false)
    }
  }

  const renderFilterInput = (filter: SearchFilter) => {
    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
            className="h-8"
          />
        )

      case 'select':
        return (
          <Select
            value={filter.value || ''}
            onValueChange={(value) => updateFilter(filter.id, value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value ? Number(e.target.value) : '')}
            className="h-8"
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={filter.id}
              checked={filter.value === true}
              onCheckedChange={(checked) => updateFilter(filter.id, checked ? true : undefined)}
            />
            <Label htmlFor={filter.id} className="text-sm font-normal">
              {filter.label}
            </Label>
          </div>
        )

      case 'date':
        return (
          <DatePicker
            value={filter.value || undefined}
            onChange={(date) => updateFilter(filter.id, date)}
            placeholder={`Select ${filter.label.toLowerCase()}`}
          />
        )

      case 'daterange':
        return (
          <div className="flex gap-2">
            <DatePicker
              value={filter.value?.start || undefined}
              onChange={(date) => updateFilter(filter.id, {
                ...filter.value,
                start: date
              })}
              placeholder="Start date"
            />
            <DatePicker
              value={filter.value?.end || undefined}
              onChange={(date) => updateFilter(filter.id, {
                ...filter.value,
                end: date
              })}
              placeholder="End date"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4"
          />
        </div>

        {showFilters && (
          <>
            <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 border-b">
                  <h4 className="font-medium">Advanced Filters</h4>
                  <p className="text-sm text-muted-foreground">Refine your search results</p>
                </div>

                <div className="max-h-96 overflow-y-auto p-4 space-y-4">
                  {filters.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{filter.label}</Label>
                        {filter.value && filter.value !== '' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFilter(filter.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>

                {activeFilters.length > 0 && (
                  <div className="p-4 border-t bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} active
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {onSaveSearch && (
                          <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium">Save Search</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Save these filters for quick access later
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="search-name">Search Name</Label>
                                  <Input
                                    id="search-name"
                                    placeholder="My saved search"
                                    value={saveSearchName}
                                    onChange={(e) => setSaveSearchName(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowSaveDialog(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveSearch}
                                    disabled={!saveSearchName.trim()}
                                  >
                                    Save Search
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        <Button variant="outline" size="sm" onClick={clearAllFilters}>
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Saved
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Saved Searches</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {savedSearches.map((search) => (
                    <DropdownMenuItem
                      key={search.id}
                      onClick={() => onLoadSearch?.(search)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{search.name}</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {search.filters.length}
                        </Badge>
                        {onDeleteSearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteSearch(search.id)
                            }}
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {filter.label}:
              {filter.type === 'boolean' ? (filter.value ? 'Yes' : 'No') :
                filter.type === 'daterange' ?
                  `${filter.value.start || '...'} - ${filter.value.end || '...'}` :
                  String(filter.value).length > 20 ?
                    String(filter.value).substring(0, 20) + '...' :
                    String(filter.value)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter(filter.id)}
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
