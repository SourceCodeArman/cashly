import { useState } from 'react'
import { Tag as TagIcon, Plus, MoreVertical, Edit, Settings, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCategories, useDeleteCategory } from '@/hooks/useCategories'
import { useSubscriptions } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog'
import { CategoryRulesDialog } from '@/components/categories/CategoryRulesDialog'
import { PaywallModal } from '@/components/paywall/PaywallModal'
import { getCategoryIcon } from '@/components/categories/IconPicker'
import { PageHeader } from "@/components/PageHeader"


export function Categories() {
  const { data: categories, isLoading } = useCategories()
  const { data: subscriptions } = useSubscriptions()
  const deleteMutation = useDeleteCategory()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showRulesDialog, setShowRulesDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallFeature, setPaywallFeature] = useState<'Custom Categories' | 'Category Rules'>('Custom Categories')
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>()

  const currentSubscription = subscriptions?.[0]
  const userTier = currentSubscription?.plan || 'free'
  const hasProAccess = userTier === 'pro' || userTier === 'premium'

  const handleCreateCategory = () => {
    if (!hasProAccess) {
      setPaywallFeature('Custom Categories')
      setShowPaywall(true)
      return
    }
    setSelectedCategory(undefined)
    setShowCreateDialog(true)
  }

  const handleEditCategory = (category: Category) => {
    if (!hasProAccess && !category.isSystemCategory) {
      setPaywallFeature('Custom Categories')
      setShowPaywall(true)
      return
    }
    setSelectedCategory(category)
    setShowEditDialog(true)
  }

  const handleManageRules = (category: Category) => {
    if (!hasProAccess) {
      setPaywallFeature('Category Rules')
      setShowPaywall(true)
      return
    }
    setSelectedCategory(category)
    setShowRulesDialog(true)
  }

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (selectedCategory) {
      await deleteMutation.mutateAsync(selectedCategory.id)
      setShowDeleteDialog(false)
      setSelectedCategory(undefined)
    }
  }

  const defaultCategories = categories?.filter((cat) => cat.isSystemCategory) || []
  const customCategories = categories?.filter((cat) => !cat.isSystemCategory) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        {/* Page Header */}
        <PageHeader
          title="Categories"
          description="Organize your transactions with custom categories and automated rules"
        >
          <Button onClick={handleCreateCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </PageHeader>

        {/* Default Categories */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Default Categories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {defaultCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
                onManageRules={handleManageRules}
                onDelete={handleDeleteCategory}
              />
            ))}
          </div>
        </div>

        {/* Custom Categories */}
        {customCategories.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Custom Categories</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={handleEditCategory}
                  onManageRules={handleManageRules}
                  onDelete={handleDeleteCategory}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CategoryFormDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
      <CategoryFormDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        category={selectedCategory}
      />
      {selectedCategory && (
        <CategoryRulesDialog
          isOpen={showRulesDialog}
          onClose={() => setShowRulesDialog(false)}
          category={selectedCategory}
        />
      )}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={paywallFeature}
      />
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface CategoryCardProps {
  category: Category
  onEdit: (category: Category) => void
  onManageRules: (category: Category) => void
  onDelete: (category: Category) => void
}

function CategoryCard({ category, onEdit, onManageRules, onDelete }: CategoryCardProps) {
  const hasRules = category.rules && category.rules.length > 0
  const categoryIcon = getCategoryIcon(category.icon, 'h-6 w-6', category.color)

  return (
    <Card className="border-border shadow-soft transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            category.color ? `bg-[${category.color}]20` : 'bg-muted'
          )}
          style={{
            backgroundColor: category.color ? `${category.color}20` : undefined,
          }}
        >
          {categoryIcon || (
            <TagIcon
              className="h-6 w-6"
              style={{
                color: category.color || undefined,
              }}
            />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{category.name}</CardTitle>
            {category.isSystemCategory && (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            )}
            {hasRules && (
              <Badge variant="outline" className="text-xs">
                {category.rules?.length} {category.rules?.length === 1 ? 'rule' : 'rules'}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs capitalize">
            {category.type}
          </CardDescription>
        </div>
        {!category.isSystemCategory && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageRules(category)}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Rules
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(category)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  )
}
