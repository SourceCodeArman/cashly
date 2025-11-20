import { useState, useMemo } from 'react'
import { Search, Filter, X, ChevronRight, Calendar, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useTransactions, useTransactionStats, useCategorizeTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function Transactions() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categoryTab, setCategoryTab] = useState<'all' | 'income' | 'expense'>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const { data: transactionsData, isLoading } = useTransactions({
    search: search || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    page_size: 100, // Fetch up to 100 transactions to show all
  })
  const { data: stats, isLoading: statsLoading } = useTransactionStats()
  const { data: categories } = useCategories(true) // Only fetch parent categories
  const categorizeTransaction = useCategorizeTransaction()

  // Date filter presets
  const applyDateFilter = (preset: string) => {
    const today = new Date()
    let start = ''
    let end = today.toISOString().split('T')[0]

    switch (preset) {
      case 'last7':
        start = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0]
        break
      case 'last30':
        start = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
        break
      case 'last3months':
        start = new Date(today.setMonth(today.getMonth() - 3)).toISOString().split('T')[0]
        break
      case 'last6months':
        start = new Date(today.setMonth(today.getMonth() - 6)).toISOString().split('T')[0]
        break
      case 'lastYear':
        start = new Date(today.setFullYear(today.getFullYear() - 1)).toISOString().split('T')[0]
        break
      case 'all':
      default:
        start = ''
        end = ''
        break
    }

    setStartDate(start)
    setEndDate(end)
    setDateFilter(preset)
  }

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Handle different response structures: results (paginated) or json (direct array) or direct array
  const transactions = useMemo(() => {
    if (!transactionsData) return []
    // Handle paginated response with 'results'
    if ('results' in transactionsData && Array.isArray(transactionsData.results)) {
      return transactionsData.results
    }
    // Handle response with 'json' field
    if ('json' in transactionsData && Array.isArray(transactionsData.json)) {
      return transactionsData.json
    }
    // Handle direct array response
    if (Array.isArray(transactionsData)) {
      return transactionsData
    }
    return []
  }, [transactionsData])

  // Group categories by type (API already returns only parent categories)
  const categorizedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return { income: [], expense: [], transfer: [] }

    return categories.reduce(
      (acc, category) => {
        if (category.type === 'income') acc.income.push(category)
        else if (category.type === 'expense') acc.expense.push(category)
        else acc.transfer.push(category)
        return acc
      },
      { income: [] as typeof categories, expense: [] as typeof categories, transfer: [] as typeof categories }
    )
  }, [categories])

  // Get categories to display based on active tab (parent categories only)
  const displayedCategories = useMemo(() => {
    if (categoryTab === 'income') return categorizedCategories.income
    if (categoryTab === 'expense') return categorizedCategories.expense
    // For 'all', combine income and expense parent categories
    return [...categorizedCategories.income, ...categorizedCategories.expense]
  }, [categoryTab, categorizedCategories])

  // Get selected category name for display
  const selectedCategory = useMemo(() => {
    if (categoryFilter === 'all' || !categories) return null
    return categories.find((cat) => {
      const id = cat.id
      return id && String(id) === String(categoryFilter)
    })
  }, [categoryFilter, categories])

  const handleCategorize = (transactionId: string, categoryId: string) => {
    categorizeTransaction.mutate({ id: transactionId, categoryId })
  }

  const handleCategorySelect = (categoryId: string) => {
    // Ensure we're working with strings
    const normalizedId = String(categoryId).trim()

    if (normalizedId === 'all') {
      setCategoryFilter('all')
    } else {
      // Use functional update to ensure we have the latest state
      setCategoryFilter((currentFilter) => {
        const currentFilterStr = String(currentFilter).trim()
        // Toggle: if clicking the same category, deselect it
        return currentFilterStr === normalizedId ? 'all' : normalizedId
      })
    }
  }

  const clearCategoryFilter = () => {
    setCategoryFilter('all')
  }

  const clearDateFilter = () => {
    setDateFilter('all')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = categoryFilter !== 'all' || dateFilter !== 'all' || search !== ''

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View and manage your transaction history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {stats ? formatCurrency(parseFloat(stats.totalSpending)) : '$0.00'}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-success">
                {stats ? formatCurrency(parseFloat(stats.totalIncome)) : '$0.00'}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {stats?.totalTransactions || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-soft">
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger className="flex w-full items-center justify-between p-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-semibold">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[
                    search && 'Search',
                    categoryFilter !== 'all' && 'Category',
                    dateFilter !== 'all' && 'Date'
                  ].filter(Boolean).length} active
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
          </CollapsibleTrigger>

          <CollapsibleContent className="CollapsibleContent">
            <div className="space-y-6 p-6 pt-0">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Date Range</span>
                  </div>
                  {dateFilter !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateFilter}
                      className="h-7 gap-1 text-xs"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant={dateFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDateFilter('all')}
                    className="text-xs"
                  >
                    All Time
                  </Button>
                  <Button
                    variant={dateFilter === 'last7' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDateFilter('last7')}
                    className="text-xs"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant={dateFilter === 'last30' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDateFilter('last30')}
                    className="text-xs"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant={dateFilter === 'last3months' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDateFilter('last3months')}
                    className="text-xs"
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant={dateFilter === 'last6months' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDateFilter('last6months')}
                    className="text-xs"
                  >
                    Last 6 Months
                  </Button>
                  <Button
                    variant={dateFilter === 'lastYear' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyDateFilter('lastYear')}
                    className="text-xs"
                  >
                    Last Year
                  </Button>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        setDateFilter('custom')
                      }}
                      placeholder="Start date"
                      className="text-xs h-9"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        setDateFilter('custom')
                      }}
                      placeholder="End date"
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Category</span>
                    {selectedCategory && (
                      <Badge
                        variant="secondary"
                        className="ml-2"
                        style={{
                          backgroundColor: `${selectedCategory.color || '#999'}20`,
                          color: selectedCategory.color || '#999',
                          borderColor: `${selectedCategory.color || '#999'}40`,
                        }}
                      >
                        {selectedCategory.name}
                      </Badge>
                    )}
                  </div>
                  {categoryFilter !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCategoryFilter}
                      className="h-7 gap-1 text-xs"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>

                <Tabs value={categoryTab} onValueChange={(v) => {
                  setCategoryTab(v as 'all' | 'income' | 'expense')
                  // Reset filter when switching tabs if current filter doesn't match tab
                  if (categoryFilter !== 'all') {
                    const currentCategory = categories?.find((cat) => cat.id === categoryFilter)
                    if (currentCategory && currentCategory.type !== v && v !== 'all') {
                      setCategoryFilter('all')
                    }
                  }
                }}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="expense">Expenses</TabsTrigger>
                    <TabsTrigger value="income">Income</TabsTrigger>
                  </TabsList>

                  {/* Render hierarchical category buttons */}
                  <div className="mt-4">
                    {categories && categories.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No categories available
                      </div>
                    ) : displayedCategories.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No {categoryTab === 'all' ? '' : categoryTab} categories found
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {/* All Categories button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleCategorySelect('all')
                          }}
                          className={cn(
                            'inline-flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                            categoryFilter === 'all'
                              ? 'shadow-sm ring-2 ring-offset-1'
                              : 'hover:bg-accent hover:text-accent-foreground'
                          )}
                          style={
                            categoryFilter === 'all'
                              ? {
                                backgroundColor: 'hsl(var(--primary))',
                                color: 'hsl(var(--primary-foreground))',
                                borderColor: 'hsl(var(--primary))',
                              }
                              : {
                                backgroundColor: 'transparent',
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--foreground))',
                              }
                          }
                        >
                          All
                        </button>

                        {/* Parent categories with expandable subcategories */}
                        {displayedCategories.map((category, index) => {
                          const categoryId = category.id
                          const categoryIdStr = categoryId ? String(categoryId).trim() : `temp-${index}`
                          const filterStr = String(categoryFilter).trim()
                          const isExpanded = expandedCategories.has(categoryIdStr)
                          const hasSubcategories = category.subcategories && category.subcategories.length > 0

                          // Check if this parent or any of its subcategories is selected
                          const isParentSelected = filterStr !== 'all' && filterStr === categoryIdStr
                          const isAnySubSelected = hasSubcategories && category.subcategories!.some(
                            sub => String(sub.id).trim() === filterStr
                          )

                          return (
                            <div key={`category-${categoryIdStr}-${index}`} className="contents">
                              {/* Parent category button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (categoryId) {
                                    if (hasSubcategories) {
                                      toggleCategory(categoryIdStr)
                                    } else {
                                      handleCategorySelect(categoryIdStr)
                                    }
                                  }
                                }}
                                className={cn(
                                  'inline-flex items-center justify-between rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                                  isParentSelected || isAnySubSelected
                                    ? 'shadow-sm ring-2 ring-offset-1'
                                    : 'hover:bg-accent hover:text-accent-foreground'
                                )}
                                style={
                                  isParentSelected
                                    ? {
                                      backgroundColor: category.color || '#999',
                                      color: '#fff',
                                      borderColor: category.color || '#999',
                                    }
                                    : {
                                      borderColor: `${category.color || '#999'}40`,
                                      color: category.color || '#999',
                                      backgroundColor: 'transparent',
                                    }
                                }
                              >
                                <span className="truncate">{category.name}</span>
                                {hasSubcategories && (
                                  <ChevronRight
                                    className={cn(
                                      "h-3 w-3 ml-1 flex-shrink-0 transition-transform",
                                      isExpanded && "rotate-90"
                                    )}
                                  />
                                )}
                              </button>

                              {/* Subcategories (shown when expanded) */}
                              {hasSubcategories && isExpanded && category.subcategories!.map((subcategory, subIndex) => {
                                const subId = String(subcategory.id).trim()
                                const isSubSelected = filterStr !== 'all' && filterStr === subId

                                return (
                                  <button
                                    key={`subcategory-${subId}-${subIndex}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleCategorySelect(subId)
                                    }}
                                    className={cn(
                                      'inline-flex items-center justify-start rounded-md border px-2 py-1.5 text-xs transition-colors pl-4',
                                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                                      isSubSelected
                                        ? 'shadow-sm ring-2 ring-offset-1'
                                        : 'hover:bg-accent hover:text-accent-foreground'
                                    )}
                                    style={
                                      isSubSelected
                                        ? {
                                          backgroundColor: subcategory.color || '#999',
                                          color: '#fff',
                                          borderColor: subcategory.color || '#999',
                                        }
                                        : {
                                          borderColor: `${subcategory.color || '#999'}40`,
                                          color: subcategory.color || '#999',
                                          backgroundColor: 'transparent',
                                        }
                                    }
                                  >
                                    <span className="truncate">↳ {subcategory.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Tabs>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>


      {/* Transactions Table */}
      <Card className="border-border shadow-soft">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactionsData?.count || transactions.length || 0} transaction(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {transactions.map((transaction) => {

                const amount = parseFloat(transaction.amount)
                const isIncome = amount > 0
                return (
                  <div
                    key={`transaction-${transaction.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{transaction.merchantName || 'Transaction'}</div>
                        {transaction.category && (
                          <Badge
                            style={{
                              backgroundColor: `${transaction.category.color || '#999'}20`,
                              color: transaction.category.color || '#999',
                            }}
                          >
                            {transaction.category.name}
                          </Badge>
                        )}
                        {!transaction.category && categories && (
                          <Select
                            value={transaction.category?.id || ''}
                            onValueChange={(categoryId: string) =>
                              handleCategorize(String(transaction.id), categoryId)
                            }
                          >
                            <SelectTrigger className="h-8 w-[180px]">
                              <SelectValue placeholder="Assign category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category, idx) => {
                                const categoryId = category.id
                                const idStr = categoryId ? String(categoryId) : `temp-${idx}`
                                return (
                                  <SelectItem key={idStr} value={idStr}>
                                    {category.name}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {transaction.description && (
                        <div className="text-sm text-muted-foreground">{transaction.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-lg font-semibold',
                        isIncome ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {isIncome ? '+' : ''}
                      {formatCurrency(Math.abs(amount))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

