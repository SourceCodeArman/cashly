import * as React from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

// Helper functions for currency input formatting
const formatCurrencyInput = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')
  
  if (!digits) return ''
  
  // Handle as string to prevent precision loss with large numbers
  // Split into dollars and cents (last 2 digits are cents)
  // If there are fewer than 2 digits, all digits are cents
  let dollarsStr = ''
  let centsStr = ''
  
  if (digits.length <= 2) {
    // 1 or 2 digits: all are cents
    dollarsStr = '0'
    centsStr = digits.padStart(2, '0')
  } else {
    // 3+ digits: last 2 are cents, rest are dollars
    dollarsStr = digits.slice(0, -2)
    centsStr = digits.slice(-2)
    
    // Remove leading zeros from dollars part
    dollarsStr = dollarsStr.replace(/^0+/, '') || '0'
  }
  
  // Add commas to dollars part (only if it's not just '0')
  if (dollarsStr && dollarsStr !== '0') {
    dollarsStr = dollarsStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  
  return `$${dollarsStr}.${centsStr}`
}

const parseCurrencyInput = (value: string): number => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')
  
  if (!digits) return 0
  
  // Parse as string first, then convert to number
  // This preserves precision for large numbers
  // Same logic as formatCurrencyInput
  let dollarsStr = ''
  let centsStr = ''
  
  if (digits.length <= 2) {
    // 1 or 2 digits: all are cents
    dollarsStr = '0'
    centsStr = digits.padStart(2, '0')
  } else {
    // 3+ digits: last 2 are cents, rest are dollars
    dollarsStr = digits.slice(0, -2)
    centsStr = digits.slice(-2)
    
    // Remove leading zeros from dollars part
    dollarsStr = dollarsStr.replace(/^0+/, '') || '0'
  }
  
  // Convert to number by combining dollars and cents
  // For very large numbers, we still need to be careful
  // But this approach minimizes precision loss
  return parseFloat(`${dollarsStr}.${centsStr}`)
}

export interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> {
  value?: number
  onChange?: (value: number) => void
  onBlur?: (value: number) => void
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onBlur, placeholder = '$0.00', ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')
    const [rawDigits, setRawDigits] = React.useState('')

    // Initialize display value from numeric value prop
    React.useEffect(() => {
      if (value !== undefined && value !== null && value > 0) {
        // Convert numeric value to cents (digits)
        const cents = Math.round(value * 100).toString()
        setRawDigits(cents)
        setDisplayValue(formatCurrencyInput(cents))
      } else {
        // Handle undefined, null, or 0
        setRawDigits('')
        setDisplayValue('')
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Extract only new digits from the input
      const newDigits = e.target.value.replace(/\D/g, '')
      setRawDigits(newDigits)
      
      // Format the raw digits
      const formatted = formatCurrencyInput(newDigits)
      setDisplayValue(formatted)
      
      // Parse and call onChange with numeric value
      const numericValue = parseCurrencyInput(newDigits)
      onChange?.(numericValue)
    }

    const handleBlur = () => {
      // Ensure formatted on blur using tracked digits
      const formatted = formatCurrencyInput(rawDigits)
      setDisplayValue(formatted)
      const numericValue = parseCurrencyInput(rawDigits)
      onBlur?.(numericValue)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all text on focus for easy editing
      e.target.select()
      // Call original onFocus if provided
      props.onFocus?.(e)
    }

    return (
      <Input
        ref={ref}
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={cn(className)}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }

