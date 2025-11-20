import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ThemeProvider'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    const cycleTheme = () => {
        if (theme === 'dark') {
            setTheme('light')
        } else {
            setTheme('dark')
        }
    }

    const getIcon = () => {
        if (theme === 'dark') return <Moon className="h-[1.2rem] w-[1.2rem]" />
        return <Sun className="h-[1.2rem] w-[1.2rem]" />
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={cycleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {getIcon()}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
