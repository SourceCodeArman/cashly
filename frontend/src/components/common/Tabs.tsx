/**
 * Tabs component with wrapping, smooth scrolling, and sliding background indicator
 */
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/utils/helpers'

export interface Tab {
  id: string
  label: string
}

export interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export default function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const sliderRef = useRef<HTMLDivElement>(null)
  const hideSliderTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({})
  const [sliderReady, setSliderReady] = useState(false)
  const [showSlider, setShowSlider] = useState(false)
  const [columns, setColumns] = useState(2)

  // Calculate responsive number of columns based on screen size and number of tabs
  // Use a fixed column count based on screen size to prevent width changes
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      let maxColumns = 2 // default for mobile
      
      if (width >= 1024) {
        maxColumns = 5 // lg
      } else if (width >= 768) {
        maxColumns = 4 // md
      } else if (width >= 640) {
        maxColumns = 3 // sm
      }
      
      // Always use the max columns for screen size to keep width constant
      // This prevents the container from resizing when tabs change
      setColumns(maxColumns)
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  // Update slider position to match active tab
  const updateSliderPosition = useCallback((skipTransition = false) => {
    const activeTabElement = tabRefs.current.get(activeTab)
    const navElement = navRef.current
    
    if (activeTabElement && navElement && sliderRef.current) {
      const tabRect = activeTabElement.getBoundingClientRect()
      const navRect = navElement.getBoundingClientRect()
      
      // Calculate position relative to nav container
      const left = tabRect.left - navRect.left
      const width = tabRect.width
      const top = tabRect.top - navRect.top
      const height = tabRect.height
      
      // Only show slider if we have valid dimensions
      if (width > 0 && height > 0) {
        setSliderStyle({
          left: `${left}px`,
          width: `${width}px`,
          top: `${top}px`,
          height: `${height}px`,
          transition: skipTransition || !sliderReady
            ? 'none'
            : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        })
        setSliderReady(true)
      }
    }
  }, [activeTab, sliderReady])

  // Use useLayoutEffect for initial position to ensure it happens after DOM layout but before paint
  useLayoutEffect(() => {
    // Reset slider ready state when activeTab changes
    setSliderReady(false)
    
    // Calculate position immediately after layout
    updateSliderPosition(true)
  }, [activeTab, updateSliderPosition])

  // Show slider when tab changes, then hide it after 1 second
  useEffect(() => {
    // Clear any existing timeout
    if (hideSliderTimeoutRef.current) {
      clearTimeout(hideSliderTimeoutRef.current)
    }

    // Show the slider when tab changes
    setShowSlider(true)

    // Hide the slider after 1 second
    hideSliderTimeoutRef.current = setTimeout(() => {
      setShowSlider(false)
    }, 1000)

    // Cleanup timeout on unmount or tab change
    return () => {
      if (hideSliderTimeoutRef.current) {
        clearTimeout(hideSliderTimeoutRef.current)
      }
    }
  }, [activeTab])

  // Update slider position on window resize or layout changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateSliderPosition(false)
    })

    const navElement = navRef.current
    if (navElement) {
      resizeObserver.observe(navElement)
    }

    const handleResize = () => updateSliderPosition(false)
    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [updateSliderPosition])

  // Scroll active tab into view smoothly (only if it's off-screen vertically)
  useEffect(() => {
    const activeTabElement = tabRefs.current.get(activeTab)
    if (activeTabElement && containerRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const container = containerRef.current
        if (!container) return
        
        const tabRect = activeTabElement.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        
        // Check if tab is out of view vertically (grid wraps, so horizontal scroll not needed)
        const isOutOfViewTop = tabRect.top < containerRect.top
        const isOutOfViewBottom = tabRect.bottom > containerRect.bottom
        
        if (isOutOfViewTop || isOutOfViewBottom) {
          activeTabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          })
        }
      }, 50)
    }
  }, [activeTab])

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId)
  }

  return (
    <div 
      ref={containerRef}
      className={cn('border-b border-gray-200 w-full overflow-hidden', className)}
    >
      <nav 
        ref={navRef}
        className="relative px-4 py-2 grid gap-2 w-full" 
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          width: '100%',
        }}
        aria-label="Tabs"
      >
        {/* Sliding background indicator */}
        <div
          ref={sliderRef}
          className={cn(
            "absolute bg-transparent backdrop-blur-md rounded-[10px] shadow-sm border border-white/30 pointer-events-none z-0 transition-opacity duration-300",
            !sliderReady && "opacity-0",
            !showSlider && sliderReady && "opacity-0"
          )}
          style={sliderReady ? sliderStyle : { display: 'none' }}
        >
          <div 
            className="absolute inset-0 bg-transparent  rounded-[10px]"
            style={{
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
            }}
          />
        </div>
        
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(tab.id, el)
                } else {
                  tabRefs.current.delete(tab.id)
                }
              }}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'relative py-3 px-2 text-sm font-medium rounded-[10px]',
                'focus:outline-none',
                'truncate text-center min-w-0 transition-all duration-200',
                isActive
                  ? 'text-primary-600 z-20 bg-white/30 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/40 backdrop-blur-sm z-10'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

