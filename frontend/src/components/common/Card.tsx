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
          'bg-white rounded-lg shadow-sm border border-gray-200',
          clickable && 'cursor-pointer',
          hover && 'hover:shadow-md transition-shadow',
          className
        )}
        {...props}
      >
        {header && (
          <div className="px-6 py-4 border-b border-gray-200">{header}</div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div>
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card

