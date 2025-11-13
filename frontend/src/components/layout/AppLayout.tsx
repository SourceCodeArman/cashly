/**
 * Main app layout component
 */
import { ReactNode, Fragment } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { authStore } from '@/store/authStore'
import { uiStore } from '@/store/uiStore'
import { Dialog, Transition } from '@headlessui/react'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const { sidebarOpen, setSidebarOpen } = uiStore()
  
  // Don't show layout on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  
  if (!isAuthenticated || isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-100 via-white to-white bg-mesh">
      <Header />
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:pb-4 lg:overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity duration-200 ease-out"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity duration-150 ease-in"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/30" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition-transform duration-200 ease-out"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition-transform duration-150 ease-in"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-64 max-w-full flex-1 bg-white pt-16 pb-4 shadow-xl">
                  <div className="w-full overflow-y-auto">
                    <Sidebar />
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-start pt-16">
                    <button
                      type="button"
                      className="p-3 text-gray-700"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Close sidebar"
                    >
                      <span className="sr-only">Close</span>
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>
        
        {/* Main Content */}
        <main className="flex-1 lg:pl-64 pt-16 pb-20 lg:pb-4">
          <div className="container-custom py-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  )
}

