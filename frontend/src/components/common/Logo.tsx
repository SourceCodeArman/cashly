/**
 * Logo component
 */
import { Link } from 'react-router-dom'
import { cn } from '@/utils/helpers'

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
}

export default function Logo({ size = 'md', className, showText = true }: LogoProps) {
  return (
    <Link
      to="/"
      className={cn(
        'flex items-center gap-2 font-bold text-primary-600 hover:text-primary-700 transition-colors',
        sizeClasses[size],
        className
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 bg-primary-600 text-white rounded-lg">
        <span className="font-bold">C</span>
      </div>
      {showText && <span>Cashly</span>}
    </Link>
  )
}


