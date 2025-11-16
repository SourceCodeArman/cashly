/**
 * Hook for scroll-triggered animations using Intersection Observer
 */
import { useEffect, useRef, useState } from 'react'

interface UseScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)
    
    // Check initial intersection state if not triggerOnce
    if (!triggerOnce) {
      const rect = element.getBoundingClientRect()
      const rootRect = { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
      const isInitiallyVisible = 
        rect.top < rootRect.bottom &&
        rect.bottom > rootRect.top &&
        rect.left < rootRect.right &&
        rect.right > rootRect.left
      if (isInitiallyVisible) {
        setIsVisible(true)
      }
    }

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, triggerOnce])

  return { elementRef, isVisible }
}

