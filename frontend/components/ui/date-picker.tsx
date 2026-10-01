'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** 'yyyy-MM-dd' -> local Date (new Date('yyyy-MM-dd') is UTC and can land on the previous day). */
export function parseISODate(value?: string | null): Date | undefined {
    if (!value) return undefined;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
}

export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

interface DatePickerFieldProps {
    /** 'yyyy-MM-dd' (the same format a native date input used) or ''. */
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    disabled?: boolean;
    /** Earliest / latest selectable date. The month/year dropdowns span these (default: 100 years back, 30 ahead). */
    min?: Date;
    max?: Date;
}

/**
 * Drop-in replacement for <input type="date">: shadcn Popover + Calendar with
 * month and year dropdowns, and future years available.
 */
export function DatePickerField({ value, onChange, placeholder = 'Pick a date', className, id, disabled, min, max }: DatePickerFieldProps) {
    const [open, setOpen] = React.useState(false);
    const selected = parseISODate(value);
    const thisYear = new Date().getFullYear();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn('w-full justify-start text-left font-normal', !selected && 'text-muted-foreground', className)}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {selected ? format(selected, 'PPP') : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={selected}
                    defaultMonth={selected ?? (max && max < new Date() ? max : new Date())}
                    startMonth={min ?? new Date(thisYear - 100, 0)}
                    endMonth={max ?? new Date(thisYear + 30, 11)}
                    disabled={[...(min ? [{ before: min }] : []), ...(max ? [{ after: max }] : [])]}
                    onSelect={(date) => {
                        if (date) {
                            onChange(toISODate(date));
                            setOpen(false);
                        }
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
