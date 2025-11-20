import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

export function PublicHeader() {
    const { isAuthenticated } = useAuthStore()
    const location = useLocation()

    const isActive = (path: string) => {
        return location.pathname === path
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Cashly Logo" className="h-10 w-10" />
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Cashly
                    </span>
                </Link>
                <nav className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {isAuthenticated ? (
                        <Button asChild className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                            <Link to="/dashboard">Go to Dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Button
                                asChild
                                variant="ghost"
                                className={cn(
                                    "hidden sm:inline-flex hover:bg-primary/10 hover:text-primary transition-colors relative",
                                    isActive('/pricing') && "text-primary"
                                )}
                            >
                                <Link to="/pricing">
                                    Pricing
                                    {isActive('/pricing') && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full" />
                                    )}
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="ghost"
                                className={cn(
                                    "hidden sm:inline-flex hover:bg-primary/10 hover:text-primary transition-colors relative",
                                    isActive('/login') && "text-primary"
                                )}
                            >
                                <Link to="/login">
                                    Sign In
                                    {isActive('/login') && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full" />
                                    )}
                                </Link>
                            </Button>
                            <Button asChild className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                <Link to="/register">Get Started</Link>
                            </Button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
