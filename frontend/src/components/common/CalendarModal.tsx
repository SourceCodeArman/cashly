/**
 * Calendar Modal component for date selection
 */
import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, setMonth, setYear } from 'date-fns'
import Modal from './Modal'
import Button from './Button'
import { cn } from '@/utils/helpers'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDate?: (date: Date | null) => void
  onSelectDateRange?: (startDate: Date | null, endDate: Date | null) => void
  selectedDate?: Date | null
  selectedStartDate?: Date | null
  selectedEndDate?: Date | null
  mode?: 'single' | 'range'
  title?: string
  minDate?: Date
  maxDate?: Date
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - 25 + i)

export default function CalendarModal({
  isOpen,
  onClose,
  onSelectDate,
  onSelectDateRange,
  selectedDate,
  selectedStartDate,
  selectedEndDate,
  mode = 'single',
  title = 'Select Date',
  minDate,
  maxDate,
}: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // Update current month when modal opens or selected date changes
  useEffect(() => {
    if (isOpen) {
      const dateToShow = mode === 'single' ? selectedDate : selectedStartDate || selectedEndDate
      if (dateToShow) {
        setCurrentMonth(dateToShow)
      }
    }
  }, [isOpen, mode, selectedDate, selectedStartDate, selectedEndDate])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handleDateClick = (day: Date) => {
    if (minDate && day < minDate) return
    if (maxDate && day > maxDate) return

    if (mode === 'single') {
      onSelectDate?.(day)
      onClose()
    } else {
      // Range mode
      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        // Start new range
        onSelectDateRange?.(day, null)
      } else if (selectedStartDate && !selectedEndDate) {
        // Complete range
        if (day < selectedStartDate) {
          // If selected date is before start date, swap them
          onSelectDateRange?.(day, selectedStartDate)
        } else {
          onSelectDateRange?.(selectedStartDate, day)
        }
      }
    }
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

  const isDateInRange = (day: Date) => {
    if (mode !== 'range' || !selectedStartDate) return false
    if (selectedStartDate && selectedEndDate) {
      return day >= selectedStartDate && day <= selectedEndDate
    }
    if (selectedStartDate && hoverDate) {
      const start = selectedStartDate < hoverDate ? selectedStartDate : hoverDate
      const end = selectedStartDate > hoverDate ? selectedStartDate : hoverDate
      return day >= start && day <= end
    }
    return false
  }

  const isDateDisabled = (day: Date) => {
    if (minDate && day < minDate) return true
    if (maxDate && day > maxDate) return true
    return false
  }

  const handleClear = () => {
    if (mode === 'single') {
      onSelectDate?.(null)
    } else {
      onSelectDateRange?.(null, null)
    }
  }

  const handleApply = () => {
    onClose()
  }

  const hasSelection = mode === 'single' 
    ? selectedDate !== null && selectedDate !== undefined
    : (selectedStartDate !== null && selectedStartDate !== undefined) || 
      (selectedEndDate !== null && selectedEndDate !== undefined)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton
    >
      <div className="py-2">
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowMonthPicker(!showMonthPicker)
                setShowYearPicker(false)
              }}
              className="px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {format(currentMonth, 'MMMM')}
            </button>
            <button
              onClick={() => {
                setShowYearPicker(!showYearPicker)
                setShowMonthPicker(false)
              }}
              className="px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {format(currentMonth, 'yyyy')}
            </button>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Month Picker */}
        {showMonthPicker && (
          <div className="grid grid-cols-3 gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
            {MONTHS.map((month, index) => (
              <button
                key={month}
                onClick={() => handleMonthSelect(index)}
                className={cn(
                  'px-3 py-2 text-sm rounded-md transition-colors',
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
          <div className="grid grid-cols-5 gap-2 mb-4 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg">
            {YEARS.map((year) => (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={cn(
                  'px-3 py-2 text-sm rounded-md transition-colors',
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
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = mode === 'single'
              ? selectedDate && isSameDay(day, selectedDate)
              : (selectedStartDate && isSameDay(day, selectedStartDate)) ||
                (selectedEndDate && isSameDay(day, selectedEndDate))
            const isInRange = isDateInRange(day)
            const isDisabled = isDateDisabled(day)
            const isStartDate = mode === 'range' && selectedStartDate && isSameDay(day, selectedStartDate)
            const isEndDate = mode === 'range' && selectedEndDate && isSameDay(day, selectedEndDate)

            return (
              <button
                key={index}
                onClick={() => !isDisabled && handleDateClick(day)}
                onMouseEnter={() => mode === 'range' && selectedStartDate && !selectedEndDate && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={isDisabled}
                className={cn(
                  'aspect-square text-sm rounded-md transition-colors relative',
                  !isCurrentMonth && 'text-gray-300',
                  isCurrentMonth && !isSelected && !isInRange && !isDisabled && 'hover:bg-gray-100 text-gray-900',
                  isDisabled && 'cursor-not-allowed opacity-30',
                  isSelected && 'bg-violet-500 text-white font-semibold',
                  isInRange && !isSelected && 'bg-violet-100 text-violet-900',
                  isStartDate && 'rounded-l-full',
                  isEndDate && 'rounded-r-full',
                  isStartDate && isEndDate && 'rounded-full'
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        {/* Selected Date Display */}
        {(mode === 'range' && (selectedStartDate || selectedEndDate)) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-1">
              {selectedStartDate && (
                <div>
                  <span className="font-medium">Start:</span> {format(selectedStartDate, 'MMM d, yyyy')}
                </div>
              )}
              {selectedEndDate && (
                <div>
                  <span className="font-medium">End:</span> {format(selectedEndDate, 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
          {hasSelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
          )}
          {mode === 'range' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              className="flex-1"
              disabled={!selectedStartDate || !selectedEndDate}
            >
              Apply
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

