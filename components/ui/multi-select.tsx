"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MultiSelectProps {
  options: { value: string; label: string }[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  label?: string
  className?: string
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options...",
  label,
  className,
}) => {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter((v) => v !== value))
    } else {
      onSelectionChange([...selectedValues, value])
    }
  }

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label)

  const displayText = selectedLabels.length > 0 
    ? selectedLabels.join(", ") 
    : placeholder

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between",
          selectedValues.length > 0 && "text-foreground"
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {label && (
            <div className="px-3 py-2 text-sm font-medium border-b">
              {label}
            </div>
          )}
          <div className="p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 px-3 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                onClick={() => handleSelect(option.value)}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border border-primary flex items-center justify-center",
                    selectedValues.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50"
                  )}
                >
                  {selectedValues.includes(option.value) && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Click outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}

export { MultiSelect } 