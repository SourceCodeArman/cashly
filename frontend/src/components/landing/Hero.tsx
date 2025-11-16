/**
 * Landing Hero Section
 */
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import CTAButton from './CTAButton'
import { cn } from '@/utils/helpers'

interface HeroProps {
  onOpenPricing?: () => void
}

export default function Hero({ onOpenPricing }: HeroProps) {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.2, triggerOnce: false })

  return (
    <section className="relative overflow-hidden">
      {/* Radial gradient accents */}
      <div className="container-custom py-24 md:py-32">
        <div 
          ref={elementRef}
          className={cn(
            "mx-auto max-w-3xl text-center transition-all duration-1000 ease-out",
            isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-10"
          )}
        >
          <div className={cn(
            "mx-auto mb-6 inline-flex items-center rounded-full border border-purple-200/30 bg-white/40 px-3 py-1 text-sm text-purple-700 backdrop-blur transition-all duration-700 delay-200",
            isVisible 
              ? "opacity-100 translate-y-0 scale-100" 
              : "opacity-0 translate-y-4 scale-95"
          )}>
            Cashly • Personal finance made simple
          </div>
          <h1 className={cn(
            "h1 text-gray-900 transition-all duration-1000 delay-300",
            isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}>
            Own your money with clarity and control
          </h1>
          <p className={cn(
            "mx-auto mt-6 max-w-[80%] lead transition-all duration-1000 delay-500",
            isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}>
            Connect your bank, track spending in real time, and hit your goals faster
            all in a beautiful, privacy-first dashboard.
          </p>
          <div className={cn(
            "mt-10 flex items-center justify-center gap-4 transition-all duration-1000 delay-700",
            isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}>
            <CTAButton />
            {onOpenPricing ? (
              <button
                onClick={onOpenPricing}
                className="rounded-xl border border-gray-200 bg-white/70 px-6 py-3 text-gray-700 shadow-sm backdrop-blur hover:bg-white transition-colors"
              >
                View Pricing
              </button>
            ) : (
              <a
                href="#features"
                className="rounded-xl border border-gray-200 bg-white/70 px-6 py-3 text-gray-700 shadow-sm backdrop-blur hover:bg-white transition-colors"
              >
                Learn more
              </a>
            )}
          </div>
          <div className={cn(
            "mt-8 text-xs text-gray-500 transition-all duration-1000 delay-1000",
            isVisible 
              ? "opacity-100" 
              : "opacity-0"
          )}>
            Free to try. No credit card required.
          </div>
        </div>
      </div>
    </section>
  )
}


