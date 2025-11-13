/**
 * Public Landing Header (Navbar)
 * Sticky, translucent, glassmorphism style
 */
export default function LandingHeader() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/20 bg-white/60 backdrop-blur">
      <div className="container-custom flex h-14 items-center justify-between">
        <a href="/" className="font-semibold text-gray-900 hover:opacity-90">
          Cashly
        </a>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-700">
          <a href="#features" className="hover:text-gray-900">
            Features
          </a>
          <a href="#pricing" className="hover:text-gray-900">
            Pricing
          </a>
          <a href="/login" className="hover:text-gray-900">
            Login
          </a>
          <a href="/register" className="btn-primary-gradient px-4 py-2 rounded-xl">
            Sign up
          </a>
        </div>
      </div>
    </nav>
  )
}


