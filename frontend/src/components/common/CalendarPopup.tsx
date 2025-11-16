/**
 * Calendar Popup component for date selection (used in popover)
 */
import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, setMonth, setYear, startOfDay, isBefore, isAfter } from 'date-fns'
import { cn } from '@/utils/helpers'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export interface CalendarPopupProps {
  selectedDate?: Date | null
  onSelectDate: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - 25 + i)

export default function CalendarPopup({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
}: CalendarPopupProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)

  // Update current month when selected date changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate)
    }
  }, [selectedDate])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handleDateClick = (day: Date) => {
    // Normalize dates to start of day for comparison
    const normalizedDay = startOfDay(day)
    
    if (minDate) {
      const normalizedMinDate = startOfDay(minDate)
      if (isBefore(normalizedDay, normalizedMinDate)) return
    }
    
    if (maxDate) {
      const normalizedMaxDate = startOfDay(maxDate)
      if (isAfter(normalizedDay, normalizedMaxDate)) return
    }
    
    onSelectDate(day)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleMonthSelect = (month: number) => {
    setCurrentMonth(setMonth(currentMonth, month))
    setShowMonthPicker(false)
  }

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year))
    setShowYearPicker(false)
  }

  const isDateDisabled = (day: Date) => {
    // Normalize dates to start of day for comparison
    const normalizedDay = startOfDay(day)
    
    if (minDate) {
      const normalizedMinDate = startOfDay(minDate)
      if (isBefore(normalizedDay, normalizedMinDate)) return true
    }
    
    if (maxDate) {
      const normalizedMaxDate = startOfDay(maxDate)
      if (isAfter(normalizedDay, normalizedMaxDate)) return true
    }
    
    return false
  }

  return (
    <div className="w-full">
      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
        </button>

        <div className="flex gap-1">
          <button
            onClick={() => {
              setShowMonthPicker(!showMonthPicker)
              setShowYearPicker(false)
            }}
            className="px-2 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            {format(currentMonth, 'MMM')}
          </button>
          <button
            onClick={() => {
              setShowYearPicker(!showYearPicker)
              setShowMonthPicker(false)
            }}
            className="px-2 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            {format(currentMonth, 'yyyy')}
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Month Picker */}
      {showMonthPicker && (
        <div className="grid grid-cols-3 gap-1 mb-3 p-2 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
          {MONTHS.map((month, index) => (
            <button
              key={month}
              onClick={() => handleMonthSelect(index)}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                isSameMonth(currentMonth, setMonth(currentMonth, index))
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              )}
            >
              {month.substring(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Year Picker */}
      {showYearPicker && (
        <div className="grid grid-cols-5 gap-1 mb-3 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
          {YEARS.map((year) => (
            <button
              key={year}
              onClick={() => handleYearSelect(year)}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                currentMonth.getFullYear() === year
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isDisabled = isDateDisabled(day)

          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!isDisabled) {
                  handleDateClick(day)
                }
              }}
              onMouseDown={(e) => {
                // Prevent input blur
                e.preventDefault()
              }}
              disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              className={cn(
                'aspect-square text-xs rounded-md transition-colors relative',
                'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1',
                !isCurrentMonth && 'text-gray-300',
                isCurrentMonth && !isSelected && !isDisabled && 'hover:bg-gray-100 text-gray-900',
                isDisabled && 'cursor-not-allowed opacity-30',
                isSelected && 'bg-violet-500 text-white font-semibold',
                isCurrentMonth && isSelected && 'ring-2 ring-violet-300'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

