import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
    children: React.ReactNode
    className?: string
    defaultOpen?: boolean
}

interface CollapsibleTriggerProps {
    children: React.ReactNode
    className?: string
}

interface CollapsibleContentProps {
    children: React.ReactNode
    className?: string
}

const CollapsibleContext = React.createContext<{
    isOpen: boolean
    toggle: () => void
}>({
    isOpen: false,
    toggle: () => { },
})

export function Collapsible({ children, className, defaultOpen = false }: CollapsibleProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    const toggle = React.useCallback(() => {
        setIsOpen(prev => !prev)
    }, [])

    return (
        <CollapsibleContext.Provider value={{ isOpen, toggle }}>
            <div className={cn("space-y-2", className)}>
                {children}
            </div>
        </CollapsibleContext.Provider>
    )
}

export function CollapsibleTrigger({ children, className }: CollapsibleTriggerProps) {
    const { isOpen, toggle } = React.useContext(CollapsibleContext)

    return (
        <button
            type="button"
            onClick={toggle}
            className={cn(
                "flex w-full items-center justify-between rounded-md p-4 text-left font-medium transition-colors hover:bg-muted/50",
                className
            )}
        >
            {children}
            <ChevronDown
                className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isOpen && "rotate-180"
                )}
            />
        </button>
    )
}

export function CollapsibleContent({ children, className }: CollapsibleContentProps) {
    const { isOpen } = React.useContext(CollapsibleContext)

    if (!isOpen) return null

    return (
        <div className={cn("px-4 pb-4", className)}>
            {children}
        </div>
    )
}
