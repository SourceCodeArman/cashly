/**
 * Date Input component with calendar popup
 */
import { useState, useRef, useEffect } from 'react'
import { format, parseISO, isValid, parse, startOfDay } from 'date-fns'
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/helpers'
import CalendarPopup from './CalendarPopup'

export interface DateInputProps {
  label?: string
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  className?: string
}

export default function DateInput({
  label,
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  minDate,
  maxDate,
  disabled = false,
  className,
}: DateInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isSelectingDateRef = useRef(false)
  
  // Default maxDate to today if not provided
  const effectiveMaxDate = maxDate || startOfDay(new Date())

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false)
      }
    }

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isPopoverOpen])

  // Convert backend format (yyyy-MM-dd) to display format (MM/dd/yyyy)
  const formatDateForDisplay = (dateString: string | undefined): string => {
    if (!dateString) return ''
    try {
      const date = parseISO(dateString)
      if (isValid(date)) {
        return format(date, 'MM/dd/yyyy')
      }
    } catch {
      // Invalid date
    }
    return dateString
  }

  // Sync input value with prop value (convert from backend format to display format)
  // Only sync if the value actually changed and we're not selecting a date
  useEffect(() => {
    // Skip sync while selecting a date - we already set the value in handleDateSelect
    if (isSelectingDateRef.current) {
      return
    }
    
    if (value) {
      const formatted = formatDateForDisplay(value)
      // Only update if different to avoid unnecessary updates
      // This handles external updates (e.g., from parent clearing filters)
      if (formatted !== inputValue) {
        setInputValue(formatted)
      }
    } else {
      // Only clear if the value prop is actually empty (not just syncing)
      // Don't clear if user is typing or selecting
      if (inputValue !== '' && !isPopoverOpen) {
        setInputValue('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Format input as user types (MM/dd/yyyy)
  const formatInputValue = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '')
    
    // Limit to 8 digits (MMDDYYYY)
    const limited = numbers.slice(0, 8)
    
    // Format with slashes
    if (limited.length === 0) return ''
    if (limited.length <= 2) return limited
    if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`
  }

  // Validate date parts
  const isValidDateParts = (month: string, day: string, year: string): boolean => {
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    const yearNum = parseInt(year, 10)

    if (monthNum < 1 || monthNum > 12) return false
    if (dayNum < 1 || dayNum > 31) return false
    if (yearNum < 1 || yearNum > 9999) return false

    // Check if date exists (e.g., Feb 30 doesn't exist)
    try {
      const date = new Date(yearNum, monthNum - 1, dayNum)
      if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
        return false
      }
    } catch {
      return false
    }

    return true
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value

    // Allow backspace to delete
    if (newValue.length < inputValue.length) {
      // Allow deletion
      const formatted = formatInputValue(newValue)
      setInputValue(formatted)
      
      if (formatted === '') {
        onChange(undefined)
      } else {
        // Try to parse partial date
        tryParseAndUpdate(formatted)
      }
      return
    }

    // Format the input as user types
    const formatted = formatInputValue(newValue)
    setInputValue(formatted)

    if (formatted === '') {
      onChange(undefined)
      return
    }

    // Try to parse and validate
    tryParseAndUpdate(formatted)
  }

  const tryParseAndUpdate = (formattedValue: string) => {
    // Extract parts from formatted value (MM/dd/yyyy)
    const parts = formattedValue.split('/')
    if (parts.length < 3) {
      // Not complete date yet
      return
    }

    const [month, day, year] = parts

    // Validate date parts
    if (!isValidDateParts(month, day, year)) {
      return
    }

    // Create date object
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    const yearNum = parseInt(year, 10)

    try {
      const parsedDate = new Date(yearNum, monthNum - 1, dayNum)
      
      if (!isValid(parsedDate)) {
        return
      }

      // Check constraints
      const normalizedDate = startOfDay(parsedDate)
      if (minDate && normalizedDate < startOfDay(minDate)) return
      if (effectiveMaxDate && normalizedDate > startOfDay(effectiveMaxDate)) return

      // Store in backend format (yyyy-MM-dd)
      const backendDate = format(parsedDate, 'yyyy-MM-dd')
      onChange(backendDate)
    } catch {
      // Invalid date
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't handle blur if we're in the middle of selecting a date from calendar
    if (isSelectingDateRef.current) {
      return
    }

    // Use setTimeout to check if focus moved to popover
    setTimeout(() => {
      // Double-check flag in case it was set during the timeout
      if (isSelectingDateRef.current) {
        return
      }

      // Check if popover still has focus or if we clicked inside it
      const activeElement = document.activeElement
      if (popoverRef.current && popoverRef.current.contains(activeElement)) {
        // Focus moved to popover, don't close
        return
      }
      
      // Only validate if we don't have a valid value prop (meaning user was typing, not selecting)
      // If we have a value prop, trust it and don't validate/clear
      if (value && inputValue.trim() !== '') {
        // We have a valid value prop and input value - just close the popover
        setIsPopoverOpen(false)
        return
      }
      
      // Focus moved away and no valid value, validate and format, then close popover
      validateAndFormatInput()
      setIsPopoverOpen(false)
    }, 150)
  }

  const validateAndFormatInput = () => {
    // Don't validate if we're selecting a date
    if (isSelectingDateRef.current) {
      return
    }

    // If we have a valid value prop, don't clear the input - preserve it
    if (value && inputValue.trim() === '') {
      // Value prop exists but input is empty - restore from value prop
      setInputValue(formatDateForDisplay(value))
      return
    }

    // On blur, validate and format the input if it's a valid date
    if (inputValue.trim() === '') {
      // Only clear if value prop is also empty (not syncing from calendar selection)
      if (!value) {
        onChange(undefined)
        setInputValue('')
      }
      return
    }

    // Extract parts from formatted value
    const parts = inputValue.split('/')
    if (parts.length < 3 || parts[2].length < 4) {
      // Incomplete date - only revert if we have a valid value prop to revert to
      if (value) {
        setInputValue(formatDateForDisplay(value))
      }
      return
    }

    const [month, day, year] = parts

    // Validate date parts
    if (!isValidDateParts(month, day, year)) {
      // Only revert if we have a valid value prop
      if (value) {
        setInputValue(formatDateForDisplay(value))
      }
      return
    }

    // Create date object
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    const yearNum = parseInt(year, 10)

    try {
      const parsedDate = new Date(yearNum, monthNum - 1, dayNum)
      
      if (!isValid(parsedDate)) {
        if (value) {
          setInputValue(formatDateForDisplay(value))
        }
        return
      }

      // Check constraints
      const normalizedDate = startOfDay(parsedDate)
      if (minDate && normalizedDate < startOfDay(minDate)) {
        if (value) {
          setInputValue(formatDateForDisplay(value))
        }
        return
      }
      if (effectiveMaxDate && normalizedDate > startOfDay(effectiveMaxDate)) {
        if (value) {
          setInputValue(formatDateForDisplay(value))
        }
        return
      }

      // Store in backend format (yyyy-MM-dd) but display in MM/dd/yyyy
      const backendDate = format(parsedDate, 'yyyy-MM-dd')
      const displayDate = format(parsedDate, 'MM/dd/yyyy')
      
      // Only update if different from current value
      if (backendDate !== value) {
        onChange(backendDate)
      }
      setInputValue(displayDate)
    } catch {
      // Invalid date - only revert if we have a valid value prop
      if (value) {
        setInputValue(formatDateForDisplay(value))
      }
    }
  }

  const handleInputFocus = () => {
    setIsPopoverOpen(true)
  }

  const handleInputClick = () => {
    setIsPopoverOpen(true)
  }

  const handleDateSelect = (date: Date | null) => {
    // Mark that we're selecting a date to prevent blur handler from interfering
    isSelectingDateRef.current = true
    
    if (date) {
      // Store in backend format (yyyy-MM-dd) but display in MM/dd/yyyy
      const backendDate = format(date, 'yyyy-MM-dd')
      const displayDate = format(date, 'MM/dd/yyyy')
      
      // Update both immediately
      setInputValue(displayDate)
      onChange(backendDate)
      setIsPopoverOpen(false)
      
      // Reset flag after state updates complete and allow value prop to sync
      // Use longer delay to ensure blur handler's setTimeout completes first
      setTimeout(() => {
        isSelectingDateRef.current = false
        // Don't blur - let the user see the selected date
        // The popover is already closed
      }, 300)
    } else {
      setInputValue('')
      onChange(undefined)
      setIsPopoverOpen(false)
      isSelectingDateRef.current = false
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInputValue('')
    onChange(undefined)
  }

  const parseDateValue = (dateString: string | undefined): Date | null => {
    if (!dateString) return null
    try {
      return parseISO(dateString)
    } catch {
      return null
    }
  }

  const selectedDate = parseDateValue(value)

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white/30',
            'text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            isPopoverOpen && 'ring-2 ring-violet-500 border-transparent'
          )}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
        </div>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 z-10"
            tabIndex={-1}
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {isPopoverOpen && (
          <div
            ref={popoverRef}
            className="absolute z-50 mt-2 left-0"
            onMouseDown={(e) => {
              // Only prevent default on the container itself, not on child elements
              if (e.target === e.currentTarget) {
                e.preventDefault()
              }
            }}
          >
            <div
              className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 w-[320px]"
              onMouseDown={(e) => {
                // Prevent input blur when clicking inside the calendar
                e.preventDefault()
              }}
            >
              <CalendarPopup
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                minDate={minDate}
                maxDate={effectiveMaxDate}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

