"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface Option {
    label: string
    value: string
    disable?: boolean
}

// Define a proper type for the MultiSelect value
export type SelectValue = string | { label: string; value: string };

export interface MultiSelectProps {
    options: Option[]
    value?: SelectValue[]
    onValueChange?: (value: SelectValue[]) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    disabled?: boolean
    className?: string
    badgeClassName?: string
    maxDisplayValues?: number
}

export function MultiSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select options",
    searchPlaceholder = "Search options...",
    emptyMessage = "No options found.",
    className,
    badgeClassName,
    disabled = false,
    maxDisplayValues,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedValues, setSelectedValues] = React.useState<SelectValue[]>(value || [])

    // Helper function to get the value regardless of whether it's a string or an object
    const getOptionValue = (option: SelectValue): string => {
        if (typeof option === 'string') return option;
        if (typeof option === 'object' && option !== null && 'value' in option) return option.value;
        return '';
    }

    // Sync with external value
    React.useEffect(() => {
        if (value !== undefined) {
            setSelectedValues(value)
        }
    }, [value])

    const handleSelect = React.useCallback(
        (optionValue: string) => {
            const isSelected = selectedValues.some(val => getOptionValue(val) === optionValue);
            const newSelectedValues = isSelected
                ? selectedValues.filter(val => getOptionValue(val) !== optionValue)
                : [...selectedValues, { value: optionValue, label: optionValue }]

            setSelectedValues(newSelectedValues)
            onValueChange?.(newSelectedValues)
        },
        [selectedValues, onValueChange],
    )

    const handleRemove = React.useCallback(
        (optionValue: string) => {
            const newSelectedValues = selectedValues.filter(val => getOptionValue(val) !== optionValue)
            setSelectedValues(newSelectedValues)
            onValueChange?.(newSelectedValues)
        },
        [selectedValues, onValueChange],
    )

    const selectedOptions = options.filter((option) =>
        selectedValues.some(val => getOptionValue(val) === option.value)
    )
    const displayOptions =
        maxDisplayValues && selectedOptions.length > maxDisplayValues
            ? selectedOptions.slice(0, maxDisplayValues)
            : selectedOptions
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1 truncate">
                        {selectedValues.length > 0 ? (
                            <>
                                {displayOptions.map((option) => (
                                    <Badge key={getOptionValue(option)} variant="secondary" className={cn("mr-1", badgeClassName)}>
                                        {option.label}
                                        <span
                                            className="ml-1 rounded-full outline-hidden ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleRemove(option.value)
                                            }}
                                            aria-label={`Remove ${option.label}`}
                                        >
                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </span>
                                    </Badge>
                                ))}
                                {maxDisplayValues && selectedOptions.length > maxDisplayValues && (
                                    <Badge variant="secondary">+{selectedOptions.length - maxDisplayValues} more</Badge>
                                )}
                            </>
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                            {options.map((option) => {
                                const isSelected = selectedValues.some(val => getOptionValue(val) === option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => handleSelect(option.value)}
                                        className="cursor-pointer"
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected ? "bg-primary text-primary-foreground" : "opacity-50",
                                            )}
                                        >
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        {option.label}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
