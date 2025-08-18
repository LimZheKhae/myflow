"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"
import { type DateRange } from "react-day-picker"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  showIcon?: boolean
  formatDate?: (date: Date) => string
}

export default function DateRangePicker({
  className,
  date,
  onDateChange,
  placeholder = "Pick a date range",
  disabled = false,
  buttonClassName,
  showIcon = true,
  formatDate = (date: Date) => format(date, "LLL dd, y"),
  ...props
}: DateRangePickerProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date)

  // Update internal state when external date prop changes
  React.useEffect(() => {
    setInternalDate(date)
  }, [date])

  const handleDateChange = (newDate: DateRange | undefined) => {
    setInternalDate(newDate)
    onDateChange?.(newDate)
  }

  const currentDate = internalDate || date

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !currentDate && "text-muted-foreground",
              buttonClassName
            )}
          >
            {showIcon && <CalendarIcon className="mr-2 h-4 w-4" />}
            {currentDate?.from ? (
              currentDate.to ? (
                <>
                  {formatDate(currentDate.from)} - {formatDate(currentDate.to)}
                </>
              ) : (
                formatDate(currentDate.from)
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={currentDate?.from}
            selected={currentDate}
            onSelect={handleDateChange}
            numberOfMonths={2}
            disabled={disabled}
            className="space-y-4"
                                                   classNames={{
                months: "flex space-x-4",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center h-8",
                caption_label: "text-sm font-medium",
                nav: "flex justify-between absolute inset-x-0",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
               table: "w-full border-collapse space-y-1",
               head_row: "flex",
               head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
               row: "flex w-full mt-2",
               cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
               day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
               day_range_end: "day-range-end",
               day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
               day_today: "bg-accent text-accent-foreground",
               day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
               day_disabled: "text-muted-foreground opacity-50",
               day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
               day_hidden: "invisible",
             }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

