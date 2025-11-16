/**
 * Simple Footer
 */
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { cn } from '@/utils/helpers'

export default function Footer() {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.3, triggerOnce: false })

  return (
    <footer 
      ref={elementRef}
      className={cn(
        "border-t border-gray-100 py-10 transition-all duration-1000 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-8"
      )}
    >
      <div className="container-custom flex flex-col items-center justify-between gap-4 text-sm text-gray-600 sm:flex-row">
        <div>© {new Date().getFullYear()} Cashly. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-gray-800 transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-gray-800 transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-gray-800 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}


