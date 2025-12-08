"use client"

import * as React from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  min?: string
  max?: string
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  min,
  max,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  
  const parseDateString = React.useCallback((dateString: string): Date | null => {
    if (!dateString) return null
    
    // Try YYYY-MM-DD format first (from API)
    const yyyymmdd = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd
      // Use local date components to avoid timezone issues
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    
    // Try MM/DD/YYYY format
    const mmddyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    
    // Fallback to standard Date parsing
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  }, [])

  const formatDateForDisplay = React.useCallback((dateString: string): string => {
    if (!dateString) return ""
    const date = parseDateString(dateString)
    if (!date) return dateString
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }, [parseDateString])
  
  const [inputValue, setInputValue] = React.useState(() => value ? formatDateForDisplay(value) : "")

  React.useEffect(() => {
    if (value) {
      // Always format as MM/DD/YYYY for display
      setInputValue(formatDateForDisplay(value))
      const date = parseDateString(value)
      if (date) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
      }
    } else {
      setInputValue("")
    }
  }, [value, formatDateForDisplay, parseDateString])

  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const parseInputDate = (input: string): Date | null => {
    // Try MM/DD/YYYY format
    const mmddyyyy = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) return date
    }
    // Try YYYY-MM-DD format
    const yyyymmdd = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) return date
    }
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    const parsedDate = parseInputDate(newValue)
    if (parsedDate) {
      const formatted = formatDateForAPI(parsedDate)
      onChange?.(formatted)
      setCurrentMonth(
        new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1)
      )
    }
  }

  const handleInputBlur = () => {
    // If input is valid, format it; otherwise clear or use current value
    if (inputValue) {
      const parsedDate = parseInputDate(inputValue)
      if (parsedDate) {
        const formatted = formatDateForAPI(parsedDate)
        onChange?.(formatted)
        setInputValue(formatDateForDisplay(formatted))
      } else if (value) {
        // If input is invalid but we have a value, restore the formatted value
        setInputValue(formatDateForDisplay(value))
      } else {
        setInputValue("")
      }
    } else if (value) {
      setInputValue(formatDateForDisplay(value))
    }
  }

  const handleDateSelect = (date: Date) => {
    const formatted = formatDateForAPI(date)
    onChange?.(formatted)
    setInputValue(formatDateForDisplay(formatted))
    setIsOpen(false)
  }

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: Date[] = []

    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonth.getDate() - i))
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day))
    }

    return days
  }

  const isDateDisabled = (date: Date): boolean => {
    if (min) {
      const minDate = new Date(min)
      minDate.setHours(0, 0, 0, 0)
      if (date < minDate) return true
    }
    if (max) {
      const maxDate = new Date(max)
      maxDate.setHours(23, 59, 59, 999)
      if (date > maxDate) return true
    }
    return false
  }

  const isDateSelected = (date: Date): boolean => {
    if (!value) return false
    const selectedDate = parseDateString(value)
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date): boolean => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    )
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <Calendar className="mr-2 h-4 w-4" />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={(e) => {
              e.stopPropagation()
              // Input value is already formatted, no need to update
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(true)
            }}
            disabled={disabled}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateMonth("prev")}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateMonth("next")}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-muted-foreground text-center py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const disabled = isDateDisabled(day)
              const selected = isDateSelected(day)
              const today = isToday(day)
              const currentMonthDay = isCurrentMonth(day)

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !disabled && handleDateSelect(day)}
                  disabled={disabled}
                  className={cn(
                    "h-9 w-9 text-sm rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-1 focus:ring-ring",
                    !currentMonthDay && "text-muted-foreground opacity-50",
                    selected &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    today &&
                      !selected &&
                      "border border-primary font-semibold",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>

          {/* Today Button */}
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => {
                const today = new Date()
                handleDateSelect(today)
              }}
              type="button"
            >
              Today
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

