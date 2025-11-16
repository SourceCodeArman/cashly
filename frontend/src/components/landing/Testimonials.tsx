/**
 * Testimonials (placeholder)
 */
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { cn } from '@/utils/helpers'

export default function Testimonials() {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.3, triggerOnce: false })

  return (
    <section className="py-16">
      <div className="container-custom">
        <div 
          ref={elementRef}
          className={cn(
            "card-glass p-8 text-center transition-all duration-1000 ease-out",
            isVisible 
              ? "opacity-100 translate-y-0 scale-100" 
              : "opacity-0 translate-y-12 scale-95"
          )}
        >
          <p className="text-xl text-gray-800">
            "Cashly made it effortless to understand where my money was going. I connected my banks
            in minutes and finally set goals I actually stick to."
          </p>
          <div className={cn(
            "mt-3 text-sm text-gray-600 transition-all duration-1000 delay-300",
            isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          )}>
            — Happy Customer
          </div>
        </div>
      </div>
    </section>
  )
}


