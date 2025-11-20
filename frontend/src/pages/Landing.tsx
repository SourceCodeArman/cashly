import { Link } from 'react-router-dom'
import { TrendingUp, Target, Shield, PiggyBank, Bell, Zap, ArrowRight, CheckCircle2, Wallet, ArrowUpRight, ArrowDownRight, LayoutDashboard, Receipt, Tag, CreditCard, Settings, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicHeader } from '@/components/PublicHeader'
import { useAuthStore } from '@/store/authStore'
import { motion, type Variants, useInView, animate } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

export function Landing() {
  const { isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState({
    active_users: 0,
    transactions_tracked: 0,
    total_savings: 0,
    budgets_created: 0,
  })

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/health/landing-stats/')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to fetch stats:', err))
  }, [])

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } },
  }

  const features = [
    {
      icon: TrendingUp,
      title: 'Smart Tracking',
      description: 'Automatically track and categorize your expenses with AI-powered insights.',
      gradient: 'from-blue-500 to-cyan-400',
      delay: 0.1,
    },
    {
      icon: Target,
      title: 'Goal Setting',
      description: 'Set savings goals and track your progress toward financial milestones.',
      gradient: 'from-emerald-500 to-green-400',
      delay: 0.2,
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Bank-level encryption keeps your financial data safe and secure.',
      gradient: 'from-purple-500 to-pink-400',
      delay: 0.3,
    },
    {
      icon: PiggyBank,
      title: 'Budget Management',
      description: 'Create and manage budgets to stay on track with your spending.',
      gradient: 'from-orange-500 to-amber-400',
      delay: 0.4,
    },
    {
      icon: Bell,
      title: 'Instant Alerts',
      description: 'Get notified about important transactions and budget updates.',
      gradient: 'from-red-500 to-rose-400',
      delay: 0.5,
    },
    {
      icon: Zap,
      title: 'Fast & Efficient',
      description: 'Lightning-fast performance with real-time sync across all devices.',
      gradient: 'from-indigo-500 to-violet-400',
      delay: 0.6,
    },
  ]

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col items-start text-left"
            >
              <motion.div variants={item} className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                The Future of Personal Finance
              </motion.div>

              <motion.h1 variants={item} className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70">
                Master Your Money <br />
                <span className="text-primary">Build Your Wealth</span>
              </motion.h1>

              <motion.p variants={item} className="text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Experience the next generation of financial tracking. AI-powered insights, real-time analytics, and beautiful visualizations to help you grow.
              </motion.p>

              <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                {isAuthenticated ? (
                  <Button asChild size="lg" className="rounded-full h-12 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-300">
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="rounded-full h-12 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-300">
                      <Link to="/register">
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-8 text-base hover:bg-secondary/50 border-border/50 backdrop-blur-sm">
                      <Link to="/login">Sign In</Link>
                    </Button>
                  </>
                )}
              </motion.div>

              <motion.div variants={item} className="mt-10 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <p>Trusted by 10,000+ users</p>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl p-2 shadow-2xl shadow-primary/10 rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex rounded-xl bg-background border border-border/50 overflow-hidden">
                  {/* Closed Sidebar Preview */}
                  <div className="w-12 bg-sidebar-accent border-r border-border/50 flex flex-col items-center py-3 space-y-3">
                    {/* Logo */}
                    <div className="h-8 w-8 mb-1">
                      <img src="/logo.svg" alt="Logo" className="h-full w-full" />
                    </div>

                    {/* Main Navigation Icons */}
                    <div className="flex flex-col items-center space-y-2.5 pt-2">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Tag className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Bottom Navigation Icons */}
                    <div className="flex-1 flex flex-col justify-end items-center space-y-2.5 pb-1">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Dashboard Content Preview */}
                  <div className="flex-1">
                    <div className="p-6 space-y-6">
                      {/* Page Header */}
                      <div className="space-y-1">
                        <div className="h-3 w-32 rounded bg-foreground/90"></div>
                        <div className="h-2 w-48 rounded bg-muted-foreground/40"></div>
                      </div>

                      {/* Stats Cards Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Total Balance Card */}
                        <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2 shadow-soft">
                          <div className="flex items-center justify-between">
                            <div className="h-2 w-16 rounded bg-muted-foreground/50"></div>
                            <Wallet className="h-4 w-4 text-primary" />
                          </div>
                          <div className="h-4 w-20 rounded bg-foreground/90"></div>
                        </div>

                        {/* Total Income Card */}
                        <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2 shadow-soft">
                          <div className="flex items-center justify-between">
                            <div className="h-2 w-16 rounded bg-muted-foreground/50"></div>
                            <ArrowUpRight className="h-4 w-4 text-success" />
                          </div>
                          <div className="h-4 w-20 rounded bg-success/90"></div>
                        </div>

                        {/* Total Spending Card */}
                        <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2 shadow-soft">
                          <div className="flex items-center justify-between">
                            <div className="h-2 w-16 rounded bg-muted-foreground/50"></div>
                            <ArrowDownRight className="h-4 w-4 text-destructive" />
                          </div>
                          <div className="h-4 w-20 rounded bg-destructive/90"></div>
                        </div>
                      </div>

                      {/* Charts & Goals Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Spending Trend */}
                        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3 shadow-soft">
                          <div className="space-y-1">
                            <div className="h-2.5 w-24 rounded bg-foreground/80"></div>
                            <div className="h-2 w-32 rounded bg-muted-foreground/40"></div>
                          </div>
                          <div className="h-24 w-full pt-2 relative overflow-hidden">
                            {/* Simulated Line Chart */}
                            <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <motion.path
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                                d="M0,35 C10,32 20,25 30,28 C40,31 50,20 60,22 C70,24 80,15 90,10 L100,5"
                                fill="none"
                                stroke="hsl(var(--destructive))"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <motion.path
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 1 }}
                                d="M0,35 C10,32 20,25 30,28 C40,31 50,20 60,22 C70,24 80,15 90,10 L100,5 V40 H0 Z"
                                fill="url(#trendGradient)"
                                stroke="none"
                              />
                            </svg>
                          </div>
                        </div>

                        {/* Active Goals */}
                        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4 shadow-soft">
                          <div className="space-y-1">
                            <div className="h-2.5 w-20 rounded bg-foreground/80"></div>
                            <div className="h-2 w-28 rounded bg-muted-foreground/40"></div>
                          </div>
                          <div className="space-y-3">
                            {[1, 2].map((i) => (
                              <div key={i} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Target className="h-3 w-3 text-primary" />
                                    <div className="h-2 w-16 rounded bg-muted-foreground/50"></div>
                                  </div>
                                  <div className="h-2 w-8 rounded bg-muted-foreground/30"></div>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: i === 1 ? '75%' : '45%' }}
                                    transition={{ duration: 1, delay: 1 + i * 0.2, ease: "easeOut" }}
                                    className="h-full bg-primary rounded-full"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-12 -right-12 z-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
              />
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-12 -left-12 z-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
            >
              Everything you need to <span className="text-primary">succeed</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Powerful features designed to help you achieve your financial goals, wrapped in a beautiful interface.
            </motion.p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 group">
                    <CardHeader>
                      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-20 border-y border-border/50 bg-secondary/30">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            <StatsCounter
              label="Active Users"
              value={stats.active_users}
              suffix="+"
            />
            <StatsCounter
              label="Transactions Tracked"
              value={stats.transactions_tracked}
              prefix="$"
              suffix="+"
              isCurrency
            />
            <StatsCounter
              label="Total Savings"
              value={stats.total_savings}
              prefix="$"
              suffix="+"
              isCurrency
            />
            <StatsCounter
              label="Budgets Created"
              value={stats.budgets_created}
              suffix="+"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-accent text-white shadow-2xl shadow-primary/20">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>

              <CardContent className="relative flex flex-col items-center justify-center py-20 text-center px-6">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl"
                >
                  Ready to transform your finances?
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-10 text-lg text-white/90 max-w-2xl"
                >
                  Join thousands of smart users who are taking control of their financial future today. No credit card required for the free trial.
                </motion.p>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {isAuthenticated ? (
                    <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full shadow-xl hover:scale-105 transition-transform text-primary font-bold">
                      <Link to="/dashboard">
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full shadow-xl hover:scale-105 transition-transform text-primary font-bold">
                      <Link to="/register">
                        Get Started Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  )}
                </motion.div>

                <div className="mt-8 flex items-center gap-6 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>7-day free trial</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border/50 bg-background py-12">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Cashly Logo" className="h-8 w-8" />
              <span className="font-bold text-lg">Cashly</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Cashly. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatsCounter({ label, value, prefix = '', suffix = '', isCurrency = false }: { label: string, value: number, prefix?: string, suffix?: string, isCurrency?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView && ref.current) {
      // Format number logic
      const format = (v: number) => {
        if (v === 0) return '0'
        if (isCurrency) {
          if (v >= 1000000000) return (v / 1000000000).toFixed(1) + 'B'
          if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
          if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
          return v.toFixed(0)
        }
        if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
        if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
        return v.toFixed(0)
      }

      const node = ref.current

      // Use faster animation for small numbers to avoid "stuck" look
      const duration = value < 100 ? 0.5 : 2

      const controls = animate(0, value, {
        duration,
        onUpdate(value) {
          node.textContent = prefix + format(value) + suffix
        },
      })
      return () => controls.stop()
    }
  }, [isInView, value, prefix, suffix, isCurrency])

  return (
    <div className="space-y-2">
      <div className="text-4xl font-bold text-foreground">
        <span ref={ref}>0</span>
      </div>
      <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
    </div>
  )
}
