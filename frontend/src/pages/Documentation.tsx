import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    LayoutDashboard,
    Wallet,
    Receipt,
    Target,
    DollarSign,
    Tag,
    Settings,
    CreditCard,
    ChevronRight,
    BookOpen,
    Menu,
    Calendar,
    Repeat
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { PublicHeader } from '@/components/PublicHeader'
import { useAuthStore } from '@/store/authStore'

export function Documentation() {
    const { isAuthenticated } = useAuthStore()
    const [activeSection, setActiveSection] = useState('getting-started')

    const sections = [
        {
            id: 'getting-started',
            title: 'Getting Started',
            icon: BookOpen,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Welcome to Cashly</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Cashly is a comprehensive personal finance management tool designed to help you track expenses, set goals, and manage your budget effectively.
                            Whether you're looking to save for a big purchase, get out of debt, or simply understand your spending habits better, Cashly has the tools you need.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sign Up</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Get started by creating a free account. You'll get access to all core features immediately.
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                                    <li>Visit the registration page</li>
                                    <li>Enter your email and create a password</li>
                                    <li>Verify your email address</li>
                                    <li>Complete your profile setup</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Start Guide</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Once you're logged in, follow these steps to get the most out of Cashly:
                                </p>
                                <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                                    <li>Set up your accounts (Bank, Cash, Credit)</li>
                                    <li>Create custom categories for your spending</li>
                                    <li>Set a monthly budget</li>
                                    <li>Start logging your transactions</li>
                                </ol>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'dashboard',
            title: 'Dashboard',
            icon: LayoutDashboard,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Dashboard Overview</h3>
                        <p className="text-muted-foreground mb-6">
                            The Dashboard is your financial command center. It provides a high-level view of your financial health at a glance.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold flex items-center gap-2">
                                    <Wallet className="h-5 w-5 text-primary" />
                                    Financial Summary
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    View your total balance, total income, and total spending for the current month. These cards give you instant feedback on your monthly performance.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    Active Goals
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Track progress towards your active savings goals. See how close you are to reaching your targets with visual progress bars.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-primary" />
                                    Recent Transactions
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    See your 5 most recent transactions. Quickly identify any unauthorized or unexpected charges.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    Spending Trend
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Visualize your spending over time with an interactive chart. Identify patterns and peak spending days.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'accounts',
            title: 'Accounts',
            icon: Wallet,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Managing Accounts</h3>
                        <p className="text-muted-foreground mb-6">
                            Track all your financial accounts in one place. Cashly supports various account types including Checking, Savings, Credit Cards, and Cash.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Adding an Account</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    To add a new account:
                                </p>
                                <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                                    <li>Navigate to the <strong>Accounts</strong> page</li>
                                    <li>Click the <strong>"Add Account"</strong> button</li>
                                    <li>Enter the account name (e.g., "Chase Checking")</li>
                                    <li>Select the account type</li>
                                    <li>Enter the current balance</li>
                                    <li>Click <strong>"Create Account"</strong></li>
                                </ol>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'transactions',
            title: 'Transactions',
            icon: Receipt,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Tracking Transactions</h3>
                        <p className="text-muted-foreground mb-6">
                            Log your income and expenses to keep your records accurate. You can filter and search through your transaction history.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Logging Expenses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                                    <li>Go to the <strong>Transactions</strong> page</li>
                                    <li>Click <strong>"Add Transaction"</strong></li>
                                    <li>Select "Expense" as the type</li>
                                    <li>Choose the account and category</li>
                                    <li>Enter the amount and date</li>
                                    <li>Add a description (optional)</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Filtering & Search</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Easily find specific transactions using the filter options:
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                                    <li>Filter by Date Range</li>
                                    <li>Filter by Type (Income/Expense)</li>
                                    <li>Filter by Category</li>
                                    <li>Search by Description</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'goals',
            title: 'Goals',
            icon: Target,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Setting Goals</h3>
                        <p className="text-muted-foreground mb-6">
                            Set financial targets and track your progress. Whether it's a vacation, a new car, or an emergency fund, Goals help you stay focused.
                        </p>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <h4 className="font-semibold">How Goals Work</h4>
                                <p className="text-sm text-muted-foreground">
                                    When you create a goal, you set a target amount and a deadline. As you save money, you can update the current amount of the goal. Cashly calculates your progress percentage and shows you how much more you need to save.
                                </p>
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm font-medium">Pro Tip:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Break down large goals into smaller milestones to keep yourself motivated!
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        },
        {
            id: 'budgets',
            title: 'Budgets',
            icon: DollarSign,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Budgeting</h3>
                        <p className="text-muted-foreground mb-6">
                            Control your spending by setting monthly budgets for different categories.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="p-4 border rounded-lg bg-card">
                                <h4 className="font-semibold mb-2">Set Limits</h4>
                                <p className="text-sm text-muted-foreground">Define how much you want to spend in each category per month.</p>
                            </div>
                            <div className="p-4 border rounded-lg bg-card">
                                <h4 className="font-semibold mb-2">Track Real-time</h4>
                                <p className="text-sm text-muted-foreground">As you add transactions, your budget progress updates automatically.</p>
                            </div>
                            <div className="p-4 border rounded-lg bg-card">
                                <h4 className="font-semibold mb-2">Get Alerts</h4>
                                <p className="text-sm text-muted-foreground">Receive notifications when you approach or exceed your budget limits.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'bills',
            title: 'Bills & Recurring',
            icon: Calendar,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Bills & Recurring Payments</h3>
                        <p className="text-muted-foreground mb-6">
                            Manage both manually-added bills/subscriptions and auto-detected recurring transactions in one unified interface.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    Manual Bills Tab
                                </CardTitle>
                                <CardDescription>
                                    Track and manage your subscription payments and recurring bills
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Add bills you pay regularly such as rent, utilities, streaming services, and insurance.
                                </p>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Features:</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                                        <li>Track bill due dates and payment status</li>
                                        <li>View upcoming bills in the next 7 days</li>
                                        <li>Filter by active, all, or overdue bills</li>
                                        <li>Calculate total monthly bill obligations</li>
                                        <li>Support for various frequencies (weekly, monthly, yearly)</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Repeat className="h-5 w-5 text-primary" />
                                    Detected Recurring Tab
                                </CardTitle>
                                <CardDescription>
                                    Automatically identify recurring transactions from your history
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Cashly analyzes your transaction history to automatically detect patterns and identify recurring payments.
                                </p>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">How It Works:</h4>
                                    <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                                        <li>Click <strong>"Run Detection"</strong> to scan your transactions</li>
                                        <li>Review detected recurring groups organized by merchant</li>
                                        <li>See transaction count, average amount, and frequency</li>
                                        <li>Mark false positives as non-recurring if needed</li>
                                    </ol>
                                </div>
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm font-medium">Detection Algorithm:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        The system looks for transactions with similar merchant names, amounts, and regular time intervals to identify subscriptions and recurring expenses you might have missed.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'categories',
            title: 'Categories',
            icon: Tag,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Categories</h3>
                        <p className="text-muted-foreground mb-6">
                            Organize your transactions with custom categories. Cashly comes with default categories, but you can create your own to match your lifestyle.
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Category Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-foreground">Parent Categories:</span>
                                    Broad groups like "Food", "Transportation", "Housing".
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-foreground">Subcategories:</span>
                                    Specific items like "Groceries", "Restaurants", "Gas", "Rent".
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold text-foreground">Colors:</span>
                                    Assign colors to categories to make them easily recognizable in charts and lists.
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            )
        },
        {
            id: 'subscription',
            title: 'Subscription',
            icon: CreditCard,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Subscription Plans</h3>
                        <p className="text-muted-foreground mb-6">
                            Choose the plan that fits your needs. Upgrade to unlock premium features.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="border-muted">
                            <CardHeader>
                                <CardTitle>Free</CardTitle>
                                <CardDescription>For basic tracking</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-sm space-y-2 text-muted-foreground">
                                    <li>• 5 Accounts</li>
                                    <li>• Basic Budgeting</li>
                                    <li>• Standard Support</li>
                                </ul>
                            </CardContent>
                        </Card>
                        <Card className="border-primary/50 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-primary">Pro</CardTitle>
                                <CardDescription>Most Popular</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-sm space-y-2 text-muted-foreground">
                                    <li>• Unlimited Accounts</li>
                                    <li>• Advanced Analytics</li>
                                    <li>• Priority Support</li>
                                    <li>• Export Data</li>
                                </ul>
                            </CardContent>
                        </Card>
                        <Card className="border-muted">
                            <CardHeader>
                                <CardTitle>Premium</CardTitle>
                                <CardDescription>For power users</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-sm space-y-2 text-muted-foreground">
                                    <li>• All Pro Features</li>
                                    <li>• AI Insights</li>
                                    <li>• Dedicated Advisor</li>
                                    <li>• Early Access</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'settings',
            title: 'Settings',
            icon: Settings,
            content: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Settings & Preferences</h3>
                        <p className="text-muted-foreground mb-6">
                            Customize your Cashly experience and manage your account details.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="grid gap-4">
                            <div className="p-4 rounded-lg border bg-card">
                                <h4 className="font-semibold mb-2">Profile</h4>
                                <p className="text-sm text-muted-foreground">Update your name, email, and phone number.</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-card">
                                <h4 className="font-semibold mb-2">Preferences</h4>
                                <p className="text-sm text-muted-foreground">Toggle between Light, Dark, and System themes. Configure notification settings.</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-card">
                                <h4 className="font-semibold mb-2">Security</h4>
                                <p className="text-sm text-muted-foreground">Change your password and manage active sessions.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ]

    const SidebarContent = () => (
        <div className="py-4">
            <div className="px-4 mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Documentation
                </h2>
            </div>
            <ScrollArea className="h-[calc(100vh-100px)] px-2">
                <div className="space-y-1">
                    {sections.map((section) => {
                        const Icon = section.icon
                        return (
                            <Button
                                key={section.id}
                                variant={activeSection === section.id ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setActiveSection(section.id)}
                            >
                                <Icon className="mr-2 h-4 w-4" />
                                {section.title}
                            </Button>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )

    return (
        <div className="min-h-screen bg-background">
            {!isAuthenticated && <PublicHeader />}

            <div className={`flex ${!isAuthenticated ? 'pt-16' : ''} `}>
                {/* Desktop Sidebar */}
                <aside className="hidden md:block w-64 border-r border-border h-[calc(100vh-4rem)] sticky top-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <SidebarContent />
                </aside>

                {/* Mobile Sidebar Trigger */}
                <div className="md:hidden fixed bottom-4 right-4 z-50">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 p-0">
                            <SidebarContent />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    <div className="container max-w-4xl mx-auto p-6 lg:p-10">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {sections.find(s => s.id === activeSection)?.content}
                        </motion.div>

                        <div className="mt-12 pt-8 border-t flex justify-between">
                            {(() => {
                                const currentIndex = sections.findIndex(s => s.id === activeSection)
                                const prevSection = sections[currentIndex - 1]
                                const nextSection = sections[currentIndex + 1]

                                return (
                                    <>
                                        <div>
                                            {prevSection && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setActiveSection(prevSection.id)}
                                                    className="group"
                                                >
                                                    <ChevronRight className="mr-2 h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
                                                    {prevSection.title}
                                                </Button>
                                            )}
                                        </div>
                                        <div>
                                            {nextSection && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setActiveSection(nextSection.id)}
                                                    className="group"
                                                >
                                                    {nextSection.title}
                                                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
