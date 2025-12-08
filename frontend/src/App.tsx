import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { useAuthStore } from '@/store/authStore'
import { Landing } from '@/pages/Landing'
import { WaitlistLanding } from '@/pages/WaitlistLanding'
import { Pricing } from '@/pages/Pricing'
import { Documentation } from '@/pages/Documentation'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Accounts } from '@/pages/Accounts'
import { Transactions } from '@/pages/Transactions'
import { RecurringTransactions } from '@/pages/RecurringTransactions'
import { Goals } from '@/pages/Goals'
import { Budgets } from '@/pages/Budgets'
import Bills from '@/pages/Bills'
import DebtsPage from '@/pages/DebtsPage'
import { Categories } from '@/pages/Categories'
import { Subscription } from '@/pages/Subscription'
import { Notifications } from '@/pages/Notifications'
import { Settings } from '@/pages/Settings'
import Analytics from '@/pages/Analytics'
import InsightsPage from '@/pages/InsightsPage'
import { AdminDashboard } from '@/pages/AdminDashboard'
import VerifyEmailChange from '@/pages/VerifyEmailChange'
import { NotFound } from '@/pages/NotFound'
import { PageTransition } from '@/components/PageTransition'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}


function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/waitlist" element={<PageTransition><WaitlistLanding /></PageTransition>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route path="/docs" element={<PageTransition><Documentation /></PageTransition>} />

        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <PageTransition>
              <AuthLayout>
                <Login />
              </AuthLayout>
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <AuthLayout>
                <Register />
              </AuthLayout>
            </PageTransition>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PageTransition>
              <ProtectedRoute>
                <VerifyEmailChange />
              </ProtectedRoute>
            </PageTransition>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Dashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/accounts"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Accounts />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/transactions"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Transactions />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/recurring-transactions"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <RecurringTransactions />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/goals"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Goals />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/budgets"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Budgets />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/bills"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Bills />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/debts"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <DebtsPage />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/categories"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Categories />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/subscription"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Subscription />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/notifications"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Notifications />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Settings />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/analytics"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <Analytics />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/insights"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProtectedLayout>
                  <InsightsPage />
                </ProtectedLayout>
              </ProtectedRoute>
            </PageTransition>
          }
        />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <PageTransition>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </PageTransition>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="cashly-ui-theme">
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
