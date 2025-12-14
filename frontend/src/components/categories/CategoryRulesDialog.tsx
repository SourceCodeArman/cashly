import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { useUpdateCategoryRules, useApplyCategoryRules } from '@/hooks/useCategories'
import type { Category, CategoryRule } from '@/types'
import { Loader2, Plus, Trash2, Play, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RULE_PRESETS, type RulePreset } from './RulePresets'
import { getCategoryIcon } from './IconPicker'
interface CategoryRulesDialogProps {
    isOpen: boolean
    onClose: () => void
    category: Category
}

export function CategoryRulesDialog({ isOpen, onClose, category }: CategoryRulesDialogProps) {
    const [rules, setRules] = useState<CategoryRule[]>(
        (category.rules || []).map((rule, idx) => ({
            ...rule,
            id: rule.id || `rule-${idx}`,
            enabled: rule.enabled !== false,
        }))
    )
    const [combination, setCombination] = useState<'AND' | 'OR'>(category.rulesCombination || 'OR')

    const updateRulesMutation = useUpdateCategoryRules()
    const applyRulesMutation = useApplyCategoryRules()

    const addRule = () => {
        setRules([
            ...rules,
            {
                id: `rule-${Date.now()}`,
                field: 'merchant_name',
                operator: 'contains',
                value: '',
                enabled: true,
            },
        ])
    }

    const addPresetRules = (preset: RulePreset) => {
        const newRules = preset.rules.map((rule, idx) => ({
            ...rule,
            id: `preset-${preset.id}-${idx}-${Date.now()}`,
            enabled: true,
        }))
        setRules([...rules, ...newRules])
    }

    const removeRule = (id: string) => {
        setRules(rules.filter((rule) => rule.id !== id))
    }

    const updateRule = (id: string, updates: Partial<CategoryRule>) => {
        setRules(rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)))
    }

    const toggleRule = (id: string) => {
        setRules(rules.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)))
    }

    const handleSave = async () => {
        try {
            // Save with combination mode
            await updateRulesMutation.mutateAsync({
                id: category.id,
                rules: rules.map(({ id, enabled, ...rule }) => rule),
                combination,
            } as any)
            onClose()
        } catch (error) {
            console.error('Failed to save rules:', error)
        }
    }

    const handleApplyRules = async () => {
        try {
            // First save the rules
            await updateRulesMutation.mutateAsync({
                id: category.id,
                rules: rules.map(({ id, enabled, ...rule }) => rule),
                combination,
            } as any)
            // Then apply them
            await applyRulesMutation.mutateAsync({ id: category.id })
        } catch (error) {
            console.error('Failed to apply rules:', error)
        }
    }

    const handleClose = () => {
        if (!updateRulesMutation.isPending && !applyRulesMutation.isPending) {
            onClose()
        }
    }

    const isLoading = updateRulesMutation.isPending || applyRulesMutation.isPending
    const enabledRules = rules.filter((r) => r.enabled !== false)

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Manage Rules for {category.name}</DialogTitle>
                    <DialogDescription>
                        Create rules to automatically categorize transactions
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="custom" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="custom">Custom Rules</TabsTrigger>
                        <TabsTrigger value="presets">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Presets
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="custom" className="space-y-4">
                        {/* Combination Mode */}
                        <div className="space-y-2">
                            <Label>Match Condition</Label>
                            <RadioGroup value={combination} onValueChange={(v) => setCombination(v as 'AND' | 'OR')}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="OR" id="or" />
                                    <Label htmlFor="or" className="font-normal cursor-pointer">
                                        Match <strong>any rule</strong> (OR) - Broader matching
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="AND" id="and" />
                                    <Label htmlFor="and" className="font-normal cursor-pointer">
                                        Match <strong>all rules</strong> (AND) - Stricter matching
                                    </Label>
                                </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground">
                                {combination === 'OR'
                                    ? 'A transaction will be categorized if it matches any of the enabled rules'
                                    : 'A transaction will be categorized only if it matches all enabled rules'}
                            </p>
                        </div>

                        {/* Rules List */}
                        <ScrollArea className="max-h-[350px] pr-4">
                            <div className="space-y-3">
                                {rules.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            No rules defined yet. Click "Add Rule" or choose from presets.
                                        </p>
                                    </div>
                                ) : (
                                    rules.map((rule) => (
                                        <Card key={rule.id} className={!rule.enabled ? 'opacity-50' : ''}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={rule.enabled !== false}
                                                                onCheckedChange={() => toggleRule(rule.id!)}
                                                                disabled={isLoading}
                                                            />
                                                            <span className="text-sm font-medium">
                                                                {rule.enabled !== false ? 'Enabled' : 'Disabled'}
                                                            </span>
                                                        </div>

                                                        <div className="grid gap-2 sm:grid-cols-3">
                                                            <div className="grid gap-1.5">
                                                                <Label className="text-xs">Field</Label>
                                                                <Select
                                                                    value={rule.field}
                                                                    onValueChange={(value) =>
                                                                        updateRule(rule.id!, {
                                                                            field: value as CategoryRule['field'],
                                                                        })
                                                                    }
                                                                    disabled={isLoading}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="merchant_name">Merchant Name</SelectItem>
                                                                        <SelectItem value="description">Description</SelectItem>
                                                                        <SelectItem value="amount">Amount</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid gap-1.5">
                                                                <Label className="text-xs">Operator</Label>
                                                                <Select
                                                                    value={rule.operator}
                                                                    onValueChange={(value) =>
                                                                        updateRule(rule.id!, {
                                                                            operator: value as CategoryRule['operator'],
                                                                        })
                                                                    }
                                                                    disabled={isLoading}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {rule.field === 'amount' ? (
                                                                            <>
                                                                                <SelectItem value="equals">equals</SelectItem>
                                                                                <SelectItem value="greater_than">greater than</SelectItem>
                                                                                <SelectItem value="less_than">less than</SelectItem>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <SelectItem value="contains">contains</SelectItem>
                                                                                <SelectItem value="equals">equals</SelectItem>
                                                                                <SelectItem value="starts_with">starts with</SelectItem>
                                                                                <SelectItem value="ends_with">ends with</SelectItem>
                                                                            </>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid gap-1.5">
                                                                <Label className="text-xs">Value</Label>
                                                                <Input
                                                                    type={rule.field === 'amount' ? 'number' : 'text'}
                                                                    placeholder={rule.field === 'amount' ? '100.00' : 'Starbucks'}
                                                                    value={rule.value}
                                                                    onChange={(e) => updateRule(rule.id!, { value: e.target.value })}
                                                                    className="h-9"
                                                                    disabled={isLoading}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeRule(rule.id!)}
                                                        disabled={isLoading}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addRule}
                                disabled={isLoading}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Rule
                            </Button>

                            {enabledRules.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                    {enabledRules.length} {enabledRules.length === 1 ? 'rule' : 'rules'} enabled
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="presets" className="space-y-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                {RULE_PRESETS.map((preset) => {
                                    const icon = getCategoryIcon(preset.icon, 'h-5 w-5', category.color)
                                    return (
                                        <Card
                                            key={preset.id}
                                            className="cursor-pointer transition-colors hover:bg-accent"
                                            onClick={() => addPresetRules(preset)}
                                        >
                                            <CardHeader className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                        {icon || <Sparkles className="h-5 w-5 text-primary" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <CardTitle className="text-sm">{preset.name}</CardTitle>
                                                        <CardDescription className="text-xs">{preset.description}</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0">
                                                <div className="text-xs text-muted-foreground">
                                                    {preset.rules.length} {preset.rules.length === 1 ? 'rule' : 'rules'}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                        <p className="text-xs text-muted-foreground">
                            Click a preset to add its rules to your category. You can modify them after adding.
                        </p>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading || enabledRules.length === 0}>
                            {updateRulesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Rules
                        </Button>
                    </div>
                    {enabledRules.length > 0 && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleApplyRules}
                            disabled={isLoading}
                        >
                            {applyRulesMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="mr-2 h-4 w-4" />
                            )}
                            Apply to Transactions
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
