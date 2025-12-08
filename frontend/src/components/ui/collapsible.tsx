import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

interface CollapsibleProps {
    children: React.ReactNode
    className?: string
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

interface CollapsibleTriggerProps {
    children: React.ReactNode
    className?: string
    showChevron?: boolean
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

export function Collapsible({ children, className, defaultOpen = false, open, onOpenChange }: CollapsibleProps) {
    const [isOpenInternal, setIsOpenInternal] = React.useState(defaultOpen)

    // Use controlled state if open prop is provided, otherwise use internal state
    const isOpen = open !== undefined ? open : isOpenInternal

    const toggle = React.useCallback(() => {
        if (onOpenChange) {
            onOpenChange(!isOpen)
        } else {
            setIsOpenInternal(prev => !prev)
        }
    }, [isOpen, onOpenChange])

    return (
        <CollapsibleContext.Provider value={{ isOpen, toggle }}>
            <div className={cn("space-y-2", className)}>
                {children}
            </div>
        </CollapsibleContext.Provider>
    )
}

export function CollapsibleTrigger({ children, className, showChevron = true }: CollapsibleTriggerProps) {
    const { isOpen, toggle } = React.useContext(CollapsibleContext)

    return (
        <button
            type="button"
            onClick={toggle}
            className={cn(
                "flex w-full items-center justify-between rounded-md p-4 text-left font-medium transition-colors hover:bg-muted/50",
                !showChevron && "p-0", // Remove default padding if no chevron
                className
            )}
        >
            {children}
            {showChevron && (
                <ChevronDown
                    className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            )}
        </button>
    )
}

export function CollapsibleContent({ children, className }: CollapsibleContentProps) {
    const { isOpen } = React.useContext(CollapsibleContext)

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                        open: { opacity: 1, height: "auto" },
                        collapsed: { opacity: 0, height: 0 }
                    }}
                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="overflow-hidden"
                >
                    <div className={cn("px-4 pb-4", className)}>
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
