import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    description?: string
    children?: React.ReactNode
    className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
            <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-serif font-bold italic tracking-tight text-[#1A1A1A]">
                    {title}
                </h1>
                {description && (
                    <p className="text-[#1A1A1A]/60">
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    )
}
