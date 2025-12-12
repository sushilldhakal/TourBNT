"use client"

import * as React from "react"
import { Check, Search, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface SearchableOption {
    label: string
    value: string
    description?: string
    imageUrl?: string
    disable?: boolean
}

export interface SearchableSelectProps {
    options: SearchableOption[]
    value?: string[]
    onValueChange?: (value: string[]) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    disabled?: boolean
    className?: string
    title?: string
    description?: string
    icon?: React.ReactNode
    maxDisplayItems?: number
    loading?: boolean
}

export function SearchableSelect({
    options,
    value = [],
    onValueChange,
    placeholder = "Search and select items...",
    searchPlaceholder = "Search items...",
    emptyMessage = "No items found.",
    className,
    title,
    description,
    icon,
    maxDisplayItems = 3,
    loading = false,
    disabled = false,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedValues, setSelectedValues] = React.useState<string[]>(value)

    React.useEffect(() => {
        setSelectedValues(value)
    }, [value])

    const handleSelect = (optionValue: string) => {
        const newSelectedValues = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue]

        setSelectedValues(newSelectedValues)
        onValueChange?.(newSelectedValues)

        // Auto-close after selection for better UX
        setOpen(false)
    }

    const handleRemove = (optionValue: string) => {
        const newSelectedValues = selectedValues.filter(v => v !== optionValue)
        setSelectedValues(newSelectedValues)
        onValueChange?.(newSelectedValues)
    }

    const getSelectedOptions = () => {
        return options.filter(option => selectedValues.includes(option.value))
    }

    const getDisplayText = () => {
        const selected = getSelectedOptions()
        if (selected.length === 0) return placeholder
        if (selected.length === 1) return selected[0].label
        if (selected.length <= maxDisplayItems) {
            return selected.map(s => s.label).join(", ")
        }
        return `${selected.length} items selected`
    }

    return (
        <Card className={cn("w-full", className)}>
            {(title || description) && (
                <CardHeader className="pb-3">
                    {title && (
                        <CardTitle className="text-lg flex items-center gap-2">
                            {icon}
                            {title}
                        </CardTitle>
                    )}
                    {description && (
                        <CardDescription>{description}</CardDescription>
                    )}
                </CardHeader>
            )}
            <CardContent className="space-y-3">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                                "w-full justify-between h-auto min-h-[2.5rem] p-3",
                                selectedValues.length === 0 && "text-muted-foreground"
                            )}
                            disabled={disabled || loading}
                        >
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {loading ? "Loading..." : getDisplayText()}
                                </span>
                            </div>
                            <Plus className={cn(
                                "h-4 w-4 shrink-0 transition-transform",
                                open && "rotate-45"
                            )} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                        <Command>
                            <CommandInput
                                placeholder={searchPlaceholder}
                                className="h-9"
                            />
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                            <CommandList className="max-h-[300px]">
                                <CommandGroup>
                                    {options.map((option) => {
                                        const isSelected = selectedValues.includes(option.value)
                                        return (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={() => handleSelect(option.value)}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSelect(option.value);
                                                }}
                                                disabled={option.disable === true}
                                                className="flex items-start gap-3 p-3 cursor-pointer"
                                            >
                                                <div className={cn(
                                                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary mt-0.5",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}>
                                                    <Check className="h-3 w-3" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="font-medium leading-none">
                                                        {option.label}
                                                    </div>
                                                    {option.description && (
                                                        <div className="text-sm text-muted-foreground line-clamp-2">
                                                            {option.description}
                                                        </div>
                                                    )}
                                                </div>
                                                {option.imageUrl && (
                                                    <img
                                                        src={option.imageUrl}
                                                        alt={option.label}
                                                        className="h-10 w-10 rounded object-cover"
                                                    />
                                                )}
                                            </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {/* Selected Items Display */}
                {selectedValues.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                            Selected ({selectedValues.length}):
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {getSelectedOptions().map((option) => (
                                <Badge
                                    key={option.value}
                                    variant="secondary"
                                    className="flex items-center gap-1 pr-1 pl-3 py-1"
                                >
                                    <span className="text-sm">{option.label}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => handleRemove(option.value)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Helper Text */}
                {options.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                        {options.length} item{options.length !== 1 ? 's' : ''} available.
                        {selectedValues.length > 0 && ` ${selectedValues.length} selected.`}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
