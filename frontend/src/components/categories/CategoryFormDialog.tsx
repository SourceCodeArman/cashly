import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories'
import type { Category, CreateCategoryForm } from '@/types'
import { Loader2 } from 'lucide-react'
import { IconPicker } from './IconPicker'

interface CategoryFormDialogProps {
    isOpen: boolean
    onClose: () => void
    category?: Category
}

export function CategoryFormDialog({ isOpen, onClose, category }: CategoryFormDialogProps) {
    const [formData, setFormData] = useState<CreateCategoryForm>({
        name: category?.name || '',
        type: category?.type || 'expense',
        icon: category?.icon || '',
        color: category?.color || '#000000',
    })

    const createMutation = useCreateCategory()
    const updateMutation = useUpdateCategory()
    const isEditing = Boolean(category)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            if (isEditing && category) {
                await updateMutation.mutateAsync({ id: category.id, data: formData })
            } else {
                await createMutation.mutateAsync(formData)
            }
            onClose()
        } catch (error) {
            // Error already handled by mutation hooks
            console.error('Failed to save category:', error)
        }
    }

    const handleClose = () => {
        if (!createMutation.isPending && !updateMutation.isPending) {
            onClose()
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Update your custom category details.' : 'Add a new custom category for organizing your transactions.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Coffee Shops"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="type">Type *</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: 'income' | 'expense' | 'transfer') =>
                                    setFormData({ ...formData, type: value })
                                }
                                disabled={isLoading}
                            >
                                <SelectTrigger id="type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="color">Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="h-10 w-20"
                                    disabled={isLoading}
                                />
                                <Input
                                    type="text"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="#000000"
                                    className="flex-1"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Icon</Label>
                            <IconPicker
                                value={formData.icon}
                                onChange={(icon) => setFormData({ ...formData, icon })}
                                color={formData.color}
                            />
                            <p className="text-xs text-muted-foreground">
                                Choose an icon from the picker or select an emoji
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Update' : 'Create'} Category
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
