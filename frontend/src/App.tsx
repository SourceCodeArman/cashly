import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { useAuthStore } from '@/store/authStore'
import { Landing } from '@/pages/Landing'
import { Pricing } from '@/pages/Pricing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Accounts } from '@/pages/Accounts'
import { Transactions } from '@/pages/Transactions'
import { Goals } from '@/pages/Goals'
import { Budgets } from '@/pages/Budgets'
import { Categories } from '@/pages/Categories'
import { Subscription } from '@/pages/Subscription'
import { Notifications } from '@/pages/Notifications'
import { Settings } from '@/pages/Settings'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { NotFound } from '@/pages/NotFound'
import { PageTransition } from '@/components/PageTransition'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSuperuser, user } = useAuthStore()

  // Check both the store's isSuperuser flag and the user object
  const hasAdminAccess = isAuthenticated && (isSuperuser || user?.isSuperuser)

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />
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
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />

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

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <PageTransition>
              <AdminRoute>
                <ProtectedLayout>
                  <AdminDashboard />
                </ProtectedLayout>
              </AdminRoute>
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
