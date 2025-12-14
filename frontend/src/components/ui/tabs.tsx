import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "text-foreground/70 bg-transparent hover:text-foreground ",
      " data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * TabsContent with direction-aware sliding animations
 * 
 * Animation mapping:
 * - slideDirection='right' (forward): inactive slides left, active slides in from right
 * - slideDirection='left' (backward): inactive slides right, active slides in from left
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
    slideDirection?: 'left' | 'right'
  }
>(({ className, slideDirection = 'right', ...props }, ref) => {
  // Map slide direction to animation classes
  // Forward (right): old content exits left, new enters from right
  // Backward (left): old content exits right, new enters from left
  const getAnimationClasses = () => {
    if (slideDirection === 'right') {
      return {
        inactive: 'data-[state=inactive]:animate-slide-out-left',
        active: 'data-[state=active]:animate-slide-in-right',
      }
    } else {
      return {
        inactive: 'data-[state=inactive]:animate-slide-out-right',
        active: 'data-[state=active]:animate-slide-in-left',
      }
    }
  }

  const animations = getAnimationClasses()

  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Prevent vertical animations - only horizontal sliding
        "overflow-hidden",
        // Absolutely position inactive tabs to prevent layout shifts
        "data-[state=inactive]:absolute data-[state=inactive]:top-0 data-[state=inactive]:left-0 data-[state=inactive]:right-0",
        // Apply slide-out animation when tab becomes inactive
        animations.inactive,
        // Disable pointer events on inactive tabs during animation
        "data-[state=inactive]:pointer-events-none",
        // Apply slide-in animation when tab becomes active
        animations.active,
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
