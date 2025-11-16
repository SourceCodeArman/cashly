/**
 * Back to top button component
 */
import { useState, useEffect } from 'react'
import { ArrowUpIcon } from '@heroicons/react/24/outline'
import Button from './Button'
import { cn } from '@/utils/helpers'

export interface BackToTopProps {
  threshold?: number
  className?: string
}

export default function BackToTop({ threshold = 400, className }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [threshold])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-8 right-8 z-50',
        className
      )}
    >
      <Button
        variant="primary"
        size="sm"
        onClick={scrollToTop}
        leftIcon={<ArrowUpIcon className="h-5 w-5" />}
        className="rounded-full shadow-lg"
        aria-label="Back to top"
      />
    </div>
  )
}


