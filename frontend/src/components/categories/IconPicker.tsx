import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Coffee, ShoppingCart, Home, Car, Plane, Utensils, Film, Book,
    Heart, Gift, Zap, Briefcase, GraduationCap, Dumbbell, Music,
    Gamepad2, Palette, Shirt, Laptop, Smartphone, Wifi, Pill,
    Scissors, Wrench, Hammer, DollarSign, CreditCard, PiggyBank,
    TrendingUp, Sparkles, Star, Trophy, Target, Flag, Bell,
    Calendar, Clock, MapPin, Navigation, Compass, Globe,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconPickerProps {
    value?: string
    onChange: (icon: string) => void
    color?: string
}

const LUCIDE_ICONS: { name: string; icon: LucideIcon }[] = [
    { name: 'coffee', icon: Coffee },
    { name: 'shopping-cart', icon: ShoppingCart },
    { name: 'home', icon: Home },
    { name: 'car', icon: Car },
    { name: 'plane', icon: Plane },
    { name: 'utensils', icon: Utensils },
    { name: 'film', icon: Film },
    { name: 'book', icon: Book },
    { name: 'heart', icon: Heart },
    { name: 'gift', icon: Gift },
    { name: 'zap', icon: Zap },
    { name: 'briefcase', icon: Briefcase },
    { name: 'graduation-cap', icon: GraduationCap },
    { name: 'dumbbell', icon: Dumbbell },
    { name: 'music', icon: Music },
    { name: 'gamepad', icon: Gamepad2 },
    { name: 'palette', icon: Palette },
    { name: 'shirt', icon: Shirt },
    { name: 'laptop', icon: Laptop },
    { name: 'smartphone', icon: Smartphone },
    { name: 'wifi', icon: Wifi },
    { name: 'pill', icon: Pill },
    { name: 'scissors', icon: Scissors },
    { name: 'wrench', icon: Wrench },
    { name: 'hammer', icon: Hammer },
    { name: 'dollar-sign', icon: DollarSign },
    { name: 'credit-card', icon: CreditCard },
    { name: 'piggy-bank', icon: PiggyBank },
    { name: 'trending-up', icon: TrendingUp },
    { name: 'sparkles', icon: Sparkles },
    { name: 'star', icon: Star },
    { name: 'trophy', icon: Trophy },
    { name: 'target', icon: Target },
    { name: 'flag', icon: Flag },
    { name: 'bell', icon: Bell },
    { name: 'calendar', icon: Calendar },
    { name: 'clock', icon: Clock },
    { name: 'map-pin', icon: MapPin },
    { name: 'navigation', icon: Navigation },
    { name: 'compass', icon: Compass },
    { name: 'globe', icon: Globe },
]

const EMOJI_ICONS = [
    '💰', '💵', '💳', '💸', '🏦', '🏪', '🛒', '🛍️', '🎁', '🎉',
    '☕', '🍕', '🍔', '🍟', '🍿', '🥤', '🍺', '🍷', '🍽️', '🍴',
    '🏠', '🏡', '🏢', '🏪', '🏥', '🏫', '🏛️', '⛪', '🕌', '🏰',
    '✈️', '🚗', '🚕', '🚌', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔',
    '📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '📹', '📺', '📻', '🎮',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
    '🎬', '🎭', '🎪', '🎨', '🎸', '🎹', '🎺', '🎻', '🥁', '🎤',
    '📚', '📖', '📝', '📄', '📰', '📋', '📌', '📍', '📎', '📏',
    '💊', '💉', '🩺', '🩹', '🌡️', '🧪', '🔬', '🔭', '🧬', '🦠',
    '👕', '👔', '👗', '👠', '👟', '👞', '🧦', '🧤', '🧣', '🎩',
]

export function IconPicker({ value, onChange, color }: IconPickerProps) {
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)

    const isEmoji = value && value.length <= 2 && !/^[a-z-]+$/.test(value)
    const selectedLucideIcon = LUCIDE_ICONS.find((i) => i.name === value)

    const filteredLucideIcons = LUCIDE_ICONS.filter((icon) =>
        icon.name.toLowerCase().includes(search.toLowerCase())
    )

    const filteredEmojis = search ? [] : EMOJI_ICONS

    const handleSelect = (icon: string) => {
        onChange(icon)
        setOpen(false)
        setSearch('')
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'h-20 w-20 p-0 flex items-center justify-center',
                        !value && 'text-muted-foreground'
                    )}
                >
                    {value ? (
                        isEmoji ? (
                            <span className="text-3xl">{value}</span>
                        ) : selectedLucideIcon ? (
                            <selectedLucideIcon.icon className="h-8 w-8" style={{ color: color || undefined }} />
                        ) : (
                            <span className="text-xs">No icon</span>
                        )
                    ) : (
                        <span className="text-xs">Pick icon</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <Tabs defaultValue="lucide" className="w-full">
                    <div className="p-3 border-b">
                        <Input
                            placeholder="Search icons..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="lucide">Icons</TabsTrigger>
                        <TabsTrigger value="emoji">Emoji</TabsTrigger>
                    </TabsList>

                    <TabsContent value="lucide" className="mt-0">
                        <ScrollArea className="h-64 p-3">
                            {filteredLucideIcons.length > 0 ? (
                                <div className="grid grid-cols-6 gap-2">
                                    {filteredLucideIcons.map(({ name, icon: Icon }) => (
                                        <Button
                                            key={name}
                                            variant={value === name ? 'default' : 'ghost'}
                                            size="sm"
                                            className="h-12 w-12 p-0"
                                            onClick={() => handleSelect(name)}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    No icons found
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="emoji" className="mt-0">
                        <ScrollArea className="h-64 p-3">
                            <div className="grid grid-cols-6 gap-2">
                                {filteredEmojis.map((emoji) => (
                                    <Button
                                        key={emoji}
                                        variant={value === emoji ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-12 w-12 p-0 text-xl"
                                        onClick={() => handleSelect(emoji)}
                                    >
                                        {emoji}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    )
}

// Helper function to get icon component from name
export function getCategoryIcon(iconName?: string, className?: string, color?: string) {
    if (!iconName) return null

    // Check if it's an emoji
    if (iconName.length <= 2 && !/^[a-z-]+$/.test(iconName)) {
        return <span className={cn('text-2xl', className)}>{iconName}</span>
    }

    // Find Lucide icon
    const lucideIcon = LUCIDE_ICONS.find((i) => i.name === iconName)
    if (lucideIcon) {
        const Icon = lucideIcon.icon
        return <Icon className={className} style={{ color: color || undefined }} />
    }

    return null
}
