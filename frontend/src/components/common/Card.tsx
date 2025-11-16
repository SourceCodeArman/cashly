/**
 * Card component
 */
import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/helpers'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode
  footer?: React.ReactNode
  clickable?: boolean
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ header, footer, clickable = false, hover = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white/40 backdrop-blur-md rounded-lg shadow-sm border border-white/30',
          clickable && 'cursor-pointer',
          hover && 'hover:shadow-md hover:bg-white/40 transition-all',
          className
        )}
        {...props}
      >
        {header && (
          <div className="px-6 py-4 border-b border-white/30">{header}</div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-white/30 bg-white/40">{footer}</div>
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card

