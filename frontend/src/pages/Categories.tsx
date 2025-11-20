import { Tag as TagIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories } from '@/hooks/useCategories'
import { cn } from '@/lib/utils'

export function Categories() {
  const { data: categories, isLoading } = useCategories()

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage your transaction categories
        </p>
      </div>

      {/* Default Categories */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Default Categories</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {defaultCategories.map((category) => (
            <Card
              key={category.id}
              className="border-border shadow-soft transition-shadow hover:shadow-md"
            >
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
                  <TagIcon
                    className="h-6 w-6"
                    style={{
                      color: category.color || undefined,
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  </div>
                  <CardDescription className="text-xs capitalize">
                    {category.type}
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Categories */}
      {customCategories.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Custom Categories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customCategories.map((category) => (
              <Card
                key={category.id}
                className="border-border shadow-soft transition-shadow hover:shadow-md"
              >
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
                    <TagIcon
                      className="h-6 w-6"
                      style={{
                        color: category.color || undefined,
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription className="text-xs capitalize">
                      {category.type}
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

