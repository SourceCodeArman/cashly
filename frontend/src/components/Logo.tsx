import { cn } from '@/lib/utils'

interface LogoProps {
    className?: string
    showText?: boolean
    variant?: 'light' | 'dark'
}

export function Logo({ className, showText = true, variant = 'dark' }: LogoProps) {
    const isDark = variant === 'dark'
    const color = isDark ? '#1A1A1A' : '#FDFCF8'

    // Concept 5: Elegant serif wordmark. 
    // We use Playfair Display which is already configured as the primary serif.

    if (!showText) {
        // Icon-only mode (just the C)
        return (
            <span
                className={cn("font-serif font-bold text-3xl select-none", className)}
                style={{ color }}
            >
                C
            </span>
        )
    }

    return (
        <div className={cn("flex items-center", className)}>
            <span
                className="font-serif font-semibold text-3xl tracking-tight select-none italic"
                style={{ color }}
            >
                Cashly
            </span>
        </div>
    )
}
