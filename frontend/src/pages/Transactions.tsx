import { useState, useMemo } from 'react'
import { Search, Filter, X, ChevronRight, Calendar, ChevronDown, Repeat, ArrowLeftRight, ChevronLeft, Loader2 } from 'lucide-react'
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
import { SkeletonList } from '@/components/common/SkeletonList'
import { EmptyState } from '@/components/common/EmptyState'


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RecurringGroupCard } from "@/components/RecurringGroupCard"
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTransactions, useTransactionStats, useCategorizeTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService, type DetectRecurringResponse } from '@/services/transactionService'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Receipt } from 'lucide-react'
import { PageHeader } from "@/components/PageHeader"

export function Transactions() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categoryTab, setCategoryTab] = useState<'all' | 'income' | 'expense'>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showRecurring, setShowRecurring] = useState<boolean>(false)
  const [showTransfers, setShowTransfers] = useState<boolean>(false)
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(20)

  const { data: transactionsData, isLoading } = useTransactions({
    search: search || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    page,
    page_size: pageSize,
    is_recurring: showRecurring ? true : undefined,
    is_transfer: showTransfers ? true : undefined,
  })
  const { data: stats, isLoading: statsLoading } = useTransactionStats()
  const { data: categories } = useCategories(true) // Only fetch parent categories
  const categorizeTransaction = useCategorizeTransaction()

  const queryClient = useQueryClient()
  const [runningRecurringDetection, setRunningRecurringDetection] = useState(false)
  const [runningTransferDetection, setRunningTransferDetection] = useState(false)
  const [detectionResult, setDetectionResult] = useState<DetectRecurringResponse | null>(null)
  const [showDetectionDialog, setShowDetectionDialog] = useState(false)

  const detectRecurringMutation = useMutation({
    mutationFn: () => transactionService.detectRecurring(3, 180),
    onSuccess: (data) => {
      if (data.data) {
        setDetectionResult(data.data)
        setShowDetectionDialog(true)
        toast.success(
          `Detected ${data.data.detected.length} recurring groups, marked ${data.data.updated_count} transactions`
        )
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to detect recurring transactions')
    },
  })

  const detectTransfersMutation = useMutation({
    mutationFn: () => transactionService.detectTransfers(30),
    onSuccess: (data) => {
      toast.success(
        `Detected ${data.data.matched_pairs.length} transfer pairs, marked ${data.data.updated_count} transactions`
      )
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to detect transfers')
    },
  })

  const markNonRecurringMutation = useMutation({
    mutationFn: (transactionIds: string[]) => transactionService.markNonRecurring(transactionIds),
    onSuccess: (data, transactionIds) => {
      toast.success(data.message || `Marked ${data.data?.updated_count} transactions as non-recurring`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      // Close the expanded detail and refresh detection results
      // Optionally re-run detection to update the list
      if (detectionResult) {
        // Filter out the group that was just marked
        const updatedDetected = detectionResult.detected.filter(
          g => !g.transaction_ids.some(id => transactionIds.includes(id))
        )
        setDetectionResult({
          ...detectionResult,
          detected: updatedDetected,
          updated_count: detectionResult.updated_count - (data.data?.updated_count || 0)
        })
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark as non-recurring')
    },
  })

  const runRecurringDetection = async () => {
    setRunningRecurringDetection(true)
    try {
      await detectRecurringMutation.mutateAsync()
    } finally {
      setRunningRecurringDetection(false)
    }
  }

  const runTransferDetection = async () => {
    setRunningTransferDetection(true)
    try {
      await detectTransfersMutation.mutateAsync()
    } finally {
      setRunningTransferDetection(false)
    }
  }

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
  const { transactions, totalCount } = useMemo(() => {
    if (!transactionsData) return { transactions: [], totalCount: 0 }

    // Handle paginated response with 'results'
    if ('results' in transactionsData && Array.isArray(transactionsData.results)) {
      return {
        transactions: transactionsData.results,
        totalCount: transactionsData.count || transactionsData.results.length
      }
    }

    // Handle response with 'json' field (legacy/fallback)
    if ('json' in transactionsData && Array.isArray(transactionsData.json)) {
      return {
        transactions: transactionsData.json,
        totalCount: transactionsData.json.length
      }
    }

    // Handle direct array response
    if (Array.isArray(transactionsData)) {
      return {
        transactions: transactionsData,
        totalCount: transactionsData.length
      }
    }

    return { transactions: [], totalCount: 0 }
  }, [transactionsData])

  const totalPages = Math.ceil(totalCount / pageSize)

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

  const hasActiveFilters = categoryFilter !== 'all' || dateFilter !== 'all' || search !== '' || showRecurring || showTransfers

  // Count recurring and transfer filters are now handled server-side, 
  // so we can't count them from 'allTransactions' because we only have the current page.
  // We can just rely on the active state of buttons.

  return (
    <div className="space-y-6" >
      {/* Page Header */}
      {/* Page Header */}
      <PageHeader
        title="Transactions"
        description="View and manage your transaction history"
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runRecurringDetection}
            disabled={runningRecurringDetection}
          >
            {runningRecurringDetection ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Repeat className="h-4 w-4 mr-2" />
            )}
            Detect Recurring
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={runTransferDetection}
            disabled={runningTransferDetection}
          >
            {runningTransferDetection ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowLeftRight className="h-4 w-4 mr-2" />
            )}
            Detect Transfers
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      < div className="grid gap-6 md:grid-cols-3" >
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
      </div >

      {/* Filters */}
      < Card className="border-border shadow-soft" >
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

              {/* Recurring & Transfer Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Special Filters</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={showRecurring ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowRecurring(!showRecurring)}
                    className="text-xs gap-1.5"
                  >
                    <Repeat className="h-3 w-3" />
                    Recurring
                    {showRecurring && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </Button>

                  <Button
                    variant={showTransfers ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowTransfers(!showTransfers)}
                    className="text-xs gap-1.5"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    Transfers
                    {showTransfers && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </Button>
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
      </Card >


      {/* Transactions Table */}
      < Card className="border-border shadow-soft" >
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactionsData?.count || transactions.length || 0} transaction(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonList items={5} />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Connect a bank account to start automatically tracking your transactions, or add them manually."
              actionLabel="Connect Account"
              onAction={() => window.location.href = '/accounts'}
            />
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
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {transaction.isRecurring && (
                          <Badge variant="outline" className="gap-1 text-[10px] h-5 px-1.5">
                            <Repeat className="h-2.5 w-2.5" />
                            Recurring
                          </Badge>
                        )}
                        {transaction.isTransfer && (
                          <Badge variant="outline" className="gap-1 text-[10px] h-5 px-1.5">
                            <ArrowLeftRight className="h-2.5 w-2.5" />
                            Transfer
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

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between border-t mt-4 pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm font-medium min-w-[3rem] text-center">
                  Page {page} of {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card >

      <Dialog open={showDetectionDialog} onOpenChange={setShowDetectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detected Recurring Transactions</DialogTitle>
            <DialogDescription>
              We found {detectionResult?.detected.length} recurring patterns in your transaction history.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] mt-4">
            <div className="space-y-4">
              {detectionResult?.detected.map((group) => (
                <RecurringGroupCard
                  key={group.merchant}
                  merchantName={group.merchant}
                  amount={group.amount}
                  count={group.occurrences}
                  periodType={group.period_type}
                  intervalDays={group.interval_days}
                  accountName={group.account_name}
                  confidence={{
                    score: group.confidence_score,
                    level: group.confidence_level
                  }}
                  dates={{
                    first: group.first_date,
                    last: group.last_date
                  }}
                  onMarkNonRecurring={() => {
                    if (confirm(`Are you sure you want to mark these ${group.occurrences} transactions as non-recurring?`)) {
                      markNonRecurringMutation.mutate(group.transaction_ids)
                    }
                  }}
                  isProcessing={markNonRecurringMutation.isPending}
                />
              ))}
            </div>

            {detectionResult?.detected.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recurring patterns found with sufficient confidence.
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowDetectionDialog(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

