"use client"

import React, { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface DualRangeSliderProps {
    min?: number
    max?: number
    step?: number
    value?: [number, number]
    defaultValue?: [number, number]
    onValueChange?: (value: number[]) => void
    className?: string
    showTicks?: boolean
    tickCount?: number
    showEditableInputs?: boolean
    currency?: string
    label?: (value: number) => string
}

export function DualRangeSlider({
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue = [min, max],
    onValueChange,
    className,
    showTicks = true,
    tickCount = 21,
    showEditableInputs = false,
    currency = "$",
    label,
}: DualRangeSliderProps) {
    const [localValue, setLocalValue] = useState<[number, number]>(value || defaultValue)
    const [isDragging, setIsDragging] = useState<"min" | "max" | null>(null)
    const [inputValues, setInputValues] = useState<[string, string]>([
        (value?.[0] || defaultValue[0]).toString(),
        (value?.[1] || defaultValue[1]).toString()
    ])
    const sliderRef = useRef<HTMLDivElement>(null)

    const currentValue = value || localValue

    React.useEffect(() => {
        setInputValues([currentValue[0].toString(), currentValue[1].toString()])
    }, [currentValue])

    const getPercentage = (val: number) => ((val - min) / (max - min)) * 100

    const getValueFromPosition = useCallback(
        (clientX: number) => {
            if (!sliderRef.current) return min

            const rect = sliderRef.current.getBoundingClientRect()
            const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
            const rawValue = min + percentage * (max - min)
            return Math.round(rawValue / step) * step
        },
        [min, max, step],
    )

    const handleInputChange = (type: "min" | "max", inputValue: string) => {
        setInputValues((prev) => (type === "min" ? [inputValue, prev[1]] : [prev[0], inputValue]))

        const numValue = Number.parseFloat(inputValue)
        if (!isNaN(numValue)) {
            let updatedValue: [number, number]

            if (type === "min") {
                const clampedMin = Math.max(min, Math.min(numValue, currentValue[1]))
                updatedValue = [clampedMin, currentValue[1]]
            } else {
                const clampedMax = Math.min(max, Math.max(numValue, currentValue[0]))
                updatedValue = [currentValue[0], clampedMax]
            }

            setLocalValue(updatedValue)
            onValueChange?.(updatedValue)
        }
    }

    const handleMouseDown = (type: "min" | "max") => (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(type)
    }

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging) return

            const newValue = getValueFromPosition(e.clientX)
            let updatedValue: [number, number]

            if (isDragging === "min") {
                updatedValue = [Math.min(newValue, currentValue[1]), currentValue[1]]
            } else {
                updatedValue = [currentValue[0], Math.max(newValue, currentValue[0])]
            }

            setLocalValue(updatedValue)
            onValueChange?.(updatedValue)
        },
        [isDragging, currentValue, getValueFromPosition, onValueChange],
    )

    const handleMouseUp = useCallback(() => {
        setIsDragging(null)
    }, [])

    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            return () => {
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
            }
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    const generateTicks = () => {
        const ticks = []
        const tickStep = (max - min) / (tickCount - 1)

        for (let i = 0; i < tickCount; i++) {
            const tickValue = Math.round(min + i * tickStep)
            const percentage = getPercentage(tickValue)

            const showLabel = i === 0 || i === tickCount - 1 || i % Math.floor(tickCount / 4) === 0

            ticks.push({
                value: tickValue,
                percentage,
                showLabel,
            })
        }

        return ticks
    }

    const minPercentage = getPercentage(currentValue[0])
    const maxPercentage = getPercentage(currentValue[1])

    return (
        <div className={cn("relative w-full", className)}>
            {/* Track */}
            <div
                ref={sliderRef}
                className="relative h-3 bg-gradient-to-r from-muted to-muted/80 rounded-full cursor-pointer shadow-inner"
            >
                {/* Active range */}
                <div
                    className="absolute h-3 bg-primary rounded-full shadow-md"
                    style={{
                        left: `${minPercentage}%`,
                        width: `${maxPercentage - minPercentage}%`,
                    }}
                />

                {/* Min handle */}
                <div
                    className={cn(
                        "absolute w-6 h-6 bg-background border-3 border-primary rounded-full cursor-grab transform -translate-x-1/2 -translate-y-1/2 top-1/2 transition-all duration-200 shadow-lg",
                        isDragging === "min" && "cursor-grabbing shadow-xl scale-125",
                    )}
                    style={{ left: `${minPercentage}%` }}
                    onMouseDown={handleMouseDown("min")}
                >
                    <div className="absolute inset-2 bg-primary rounded-full" />
                </div>

                {/* Max handle */}
                <div
                    className={cn(
                        "absolute w-6 h-6 bg-background border-3 border-primary rounded-full cursor-grab transform -translate-x-1/2 -translate-y-1/2 top-1/2 transition-all duration-200 shadow-lg",
                        isDragging === "max" && "cursor-grabbing shadow-xl scale-125",
                    )}
                    style={{ left: `${maxPercentage}%` }}
                    onMouseDown={handleMouseDown("max")}
                >
                    <div className="absolute inset-2 bg-primary rounded-full" />
                </div>
            </div>

            {showTicks && (
                <div className="relative mt-3">
                    {/* Tick marks */}
                    <div className="relative h-3">
                        {generateTicks().map((tick, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "absolute transform -translate-x-1/2 bg-muted-foreground/40",
                                    tick.showLabel ? "w-0.5 h-3" : "w-px h-2",
                                )}
                                style={{ left: `${tick.percentage}%` }}
                            />
                        ))}
                    </div>

                    {/* Tick labels */}
                    <div className="relative mt-2">
                        {generateTicks().map(
                            (tick, index) =>
                                tick.showLabel && (
                                    <div
                                        key={index}
                                        className="absolute text-sm font-medium text-muted-foreground transform -translate-x-1/2"
                                        style={{ left: `${tick.percentage}%` }}
                                    >
                                        {label ? label(tick.value) : tick.value}
                                    </div>
                                ),
                        )}
                    </div>
                </div>
            )}

            {showEditableInputs ? (
                // Editable price inputs
                <div className="flex items-center justify-center gap-4 mt-6 pt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Min:</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                {currency}
                            </span>
                            <input
                                type="number"
                                value={inputValues[0]}
                                onChange={(e) => handleInputChange("min", e.target.value)}
                                className="w-20 pl-8 pr-2 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                min={min}
                                max={max}
                                step={step}
                            />
                        </div>
                    </div>

                    <div className="w-4 h-px bg-border" />

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Max:</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                {currency}
                            </span>
                            <input
                                type="number"
                                value={inputValues[1]}
                                onChange={(e) => handleInputChange("max", e.target.value)}
                                className="w-20 pl-8 pr-2 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                min={min}
                                max={max}
                                step={step}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                // Original value display
                <div className="flex justify-center mt-6">
                    <div className="px-4 py-2 bg-muted rounded-lg shadow-sm">
                        <span className="text-lg font-semibold text-foreground">
                            {label ? `${label(currentValue[0])} - ${label(currentValue[1])}` : `${currentValue[0]} - ${currentValue[1]}`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
