import * as React from 'react'
import { format, parse, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  value: string           // ISO date string "YYYY-MM-DD"
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  toDate?: Date
  fromDate?: Date
  fromYear?: number
  toYear?: number
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', disabled, className, toDate, fromDate, fromYear, toYear }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const validSelected = selected && isValid(selected) ? selected : undefined
  const currentYear = new Date().getFullYear()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !validSelected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {validSelected ? format(validSelected, 'dd MMM yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={validSelected}
          onSelect={day => {
            onChange(day ? format(day, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          disabled={toDate ? { after: toDate } : undefined}
          captionLayout="dropdown"
          startMonth={fromDate ?? new Date(fromYear ?? currentYear - 10, 0)}
          endMonth={toDate ?? new Date(toYear ?? currentYear + 5, 11)}
          defaultMonth={validSelected ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
