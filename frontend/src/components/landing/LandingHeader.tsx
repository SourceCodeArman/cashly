/**
 * Public Landing Header (Navbar)
 * Sticky, translucent, glassmorphism style
 */
interface LandingHeaderProps {
  onOpenPricing?: () => void
}

export default function LandingHeader({ onOpenPricing }: LandingHeaderProps) {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur">
      <div className="container-custom flex h-14 items-center justify-between">
        <a href="/" className="text-2xl font-semibold text-gray-900 hover:opacity-90">
          Cashly
        </a>
        <div className="hidden md:flex items-center gap-6 text-sm text-black">
          <a href="#features" className="hover:text-black">
            Features
          </a>
          {onOpenPricing ? (
            <button 
              onClick={onOpenPricing}
              className="hover:text-gray-900 cursor-pointer"
            >
              Pricing
            </button>
          ) : (
            <a href="#pricing" className="hover:text-gray-900">
              Pricing
            </a>
          )}
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


