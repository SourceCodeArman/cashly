/**
 * Features Section
 */
import { useState, useEffect } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { cn } from '@/utils/helpers'

interface FeatureCardProps {
  feature: { title: string; desc: string }
  index: number
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const { elementRef, isVisible } = useScrollAnimation({ 
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px',
    triggerOnce: false
  })
  
  // Create varied animation patterns for each card
  // Note: hidden state is simpler for reverse scroll - just fade out and move down slightly
  const animationPatterns = [
    // Card 0: Slide from left with rotation (scroll down), fade down (scroll up)
    {
      visible: "opacity-100 translate-x-0 translate-y-0 rotate-0 scale-100",
      hidden: "opacity-0 -translate-x-16 translate-y-8 -rotate-6 scale-95",
      hiddenUp: "opacity-0 translate-y-8 scale-95"
    },
    // Card 1: Slide from right with rotation (scroll down), fade down (scroll up)
    {
      visible: "opacity-100 translate-x-0 translate-y-0 rotate-0 scale-100",
      hidden: "opacity-0 translate-x-16 translate-y-8 rotate-6 scale-95",
      hiddenUp: "opacity-0 translate-y-8 scale-95"
    },
    // Card 2: Slide from bottom with scale
    {
      visible: "opacity-100 translate-y-0 scale-100",
      hidden: "opacity-0 translate-y-16 scale-90",
      hiddenUp: "opacity-0 translate-y-8 scale-95"
    },
    // Card 3: Slide from left with slight rotation (scroll down), fade down (scroll up)
    {
      visible: "opacity-100 translate-x-0 translate-y-0 rotate-0 scale-100",
      hidden: "opacity-0 -translate-x-12 translate-y-6 rotate-3 scale-95",
      hiddenUp: "opacity-0 translate-y-8 scale-95"
    },
    // Card 4: Slide from right with slight rotation (scroll down), fade down (scroll up)
    {
      visible: "opacity-100 translate-x-0 translate-y-0 rotate-0 scale-100",
      hidden: "opacity-0 translate-x-12 translate-y-6 -rotate-3 scale-95",
      hiddenUp: "opacity-0 translate-y-8 scale-95"
    },
    // Card 5: Zoom in from center with rotation (scroll down), fade down (scroll up)
    {
      visible: "opacity-100 translate-y-0 rotate-0 scale-100",
      hidden: "opacity-0 translate-y-8 rotate-12 scale-75",
      hiddenUp: "opacity-0 translate-y-8 scale-95"
    }
  ]
  
  const pattern = animationPatterns[index % animationPatterns.length]
  const easing = index % 3 === 0 ? 'ease-out' : index % 3 === 1 ? 'ease-in-out' : 'ease-out'
  const duration = index % 2 === 0 ? 800 : 700
  
  // Use simpler reverse animation when scrolling up (always fade down, no rotation/horizontal movement)
  // Track if element was ever visible to determine which exit animation to use
  const [wasVisible, setWasVisible] = useState(false)
  useEffect(() => {
    if (isVisible) {
      setWasVisible(true)
    }
  }, [isVisible])
  
  // If element was visible before and is now hidden, use simpler animation (scroll up)
  // If element was never visible, use the full entrance animation (scroll down)
  const isScrollingUp = wasVisible && !isVisible
  const hiddenClass = isScrollingUp ? pattern.hiddenUp : pattern.hidden
  
  // Remove delay when scrolling up so animation plays immediately
  const transitionDelay = isScrollingUp ? '0ms' : `${index * 80}ms`
  
  return (
    <div
      ref={elementRef}
      className={cn(
        "card-glass p-6 hover-float transition-all",
        easing,
        isVisible ? pattern.visible : hiddenClass
      )}
      style={{ 
        transitionDelay,
        transitionDuration: `${duration}ms`
      }}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-semibold transition-all duration-500",
        isVisible ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 rotate-45"
      )} style={{ transitionDelay: isScrollingUp ? '0ms' : `${index * 80 + 200}ms` }}>
        ✓
      </div>
      <h3 className={cn(
        "mt-4 text-lg font-semibold text-slate-800 transition-all duration-500",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      )} style={{ transitionDelay: isScrollingUp ? '0ms' : `${index * 80 + 300}ms` }}>
        {feature.title}
      </h3>
      <p className={cn(
        "mt-2 text-gray-600 transition-all duration-500",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      )} style={{ transitionDelay: isScrollingUp ? '0ms' : `${index * 80 + 400}ms` }}>
        {feature.desc}
      </p>
    </div>
  )
}

export default function Features() {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2, triggerOnce: false })
  
  const features = [
    {
      title: 'Bank connections',
      desc: 'Securely connect your accounts to see balances and transactions in one place.',
    },
    {
      title: 'Smart categorization',
      desc: 'AI-assisted categorization helps you understand spending patterns instantly.',
    },
    {
      title: 'Budgets & goals',
      desc: 'Create actionable budgets and savings goals and track progress automatically.',
    },
    {
      title: 'Real-time insights',
      desc: 'Beautiful dashboards show cash flow, trends, and upcoming bills at a glance.',
    },
    {
      title: 'Privacy-first',
      desc: `Your data stays encrypted. We never sell it. You control what's shared.`,
    },
    {
      title: 'Fast & delightful',
      desc: 'A crisp, modern experience with responsive UI and smooth interactions.',
    },
  ]

  return (
    <section id="features" className="py-20 md:py-24">
      <div className="container-custom">
        <div 
          ref={headerRef}
          className={cn(
            "mx-auto max-w-2xl text-center transition-all duration-1000 ease-out",
            headerVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">Everything you need</h2>
          <p className="mt-3 text-gray-600">
            Cashly brings powerful tools together so you can master your finances without the
            complexity.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, index) => (
            <FeatureCard key={f.title} feature={f} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}


