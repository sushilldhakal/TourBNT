"use client";

import { Check, ChevronDown, Palette } from "lucide-react";
import { useEditor } from "novel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Interface for color selector props
 */
export interface ColorSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Predefined color palette for text and background colors
 */
const TEXT_COLORS = [
    { name: "Default", value: "default" },
    { name: "Purple", value: "#9333EA" },
    { name: "Red", value: "#E00000" },
    { name: "Yellow", value: "#EAB308" },
    { name: "Blue", value: "#2563EB" },
    { name: "Green", value: "#16A34A" },
    { name: "Orange", value: "#F97316" },
    { name: "Pink", value: "#EC4899" },
    { name: "Gray", value: "#6B7280" },
];

const HIGHLIGHT_COLORS = [
    { name: "Default", value: "default" },
    { name: "Purple", value: "#F3E8FF" },
    { name: "Red", value: "#FEE2E2" },
    { name: "Yellow", value: "#FEF3C7" },
    { name: "Blue", value: "#DBEAFE" },
    { name: "Green", value: "#D1FAE5" },
    { name: "Orange", value: "#FFEDD5" },
    { name: "Pink", value: "#FCE7F3" },
    { name: "Gray", value: "#F3F4F6" },
];

/**
 * ColorSelector Component
 * 
 * A popover for applying text colors and background colors (highlights) to selected text.
 * Provides a palette of predefined colors for both text and background.
 * 
 * Features:
 * - Text color selection
 * - Background color (highlight) selection
 * - Visual color swatches
 * - Remove color option (default)
 * - Active color indication with checkmark
 * - Separate sections for text and background colors
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * @param props - Component props
 * @returns Rendered color selector
 */
export const ColorSelector = ({ open, onOpenChange }: ColorSelectorProps) => {
    const { editor } = useEditor();

    if (!editor) return null;

    /**
     * Get the currently active text color
     */
    const activeTextColor = editor.getAttributes("textStyle").color || "default";

    /**
     * Get the currently active highlight color
     */
    const activeHighlightColor = editor.getAttributes("highlight").color || "default";

    /**
     * Apply text color to selected text
     */
    const applyTextColor = (color: string) => {
        if (color === "default") {
            editor.chain().focus().unsetColor().run();
        } else {
            editor.chain().focus().setColor(color).run();
        }
    };

    /**
     * Apply background color (highlight) to selected text
     */
    const applyHighlightColor = (color: string) => {
        if (color === "default") {
            editor.chain().focus().unsetHighlight().run();
        } else {
            editor.chain().focus().setHighlight({ color }).run();
        }
    };

    return (
        <Popover modal={true} open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 rounded-none border-none hover:bg-accent focus:ring-0"
                    aria-label="Change text or background color"
                >
                    <Palette className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-64 p-3"
                sideOffset={5}
            >
                <div className="space-y-4">
                    {/* Text Color Section */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Text Color</div>
                        <div className="grid grid-cols-5 gap-2">
                            {TEXT_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => {
                                        applyTextColor(color.value);
                                    }}
                                    className={cn(
                                        "group relative flex h-8 w-8 items-center justify-center rounded-md border-2 transition-all hover:scale-105",
                                        activeTextColor === color.value
                                            ? "border-primary"
                                            : "border-muted hover:border-muted-foreground"
                                    )}
                                    style={{
                                        backgroundColor:
                                            color.value === "default" ? "transparent" : color.value,
                                    }}
                                    title={color.name}
                                    aria-label={`Set text color to ${color.name}`}
                                >
                                    {color.value === "default" && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            A
                                        </span>
                                    )}
                                    {activeTextColor === color.value && (
                                        <Check
                                            className={cn(
                                                "h-4 w-4",
                                                color.value === "default" || color.value === "#EAB308"
                                                    ? "text-foreground"
                                                    : "text-white"
                                            )}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t" />

                    {/* Background Color Section */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Background Color</div>
                        <div className="grid grid-cols-5 gap-2">
                            {HIGHLIGHT_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => {
                                        applyHighlightColor(color.value);
                                    }}
                                    className={cn(
                                        "group relative flex h-8 w-8 items-center justify-center rounded-md border-2 transition-all hover:scale-105",
                                        activeHighlightColor === color.value
                                            ? "border-primary"
                                            : "border-muted hover:border-muted-foreground"
                                    )}
                                    style={{
                                        backgroundColor:
                                            color.value === "default" ? "transparent" : color.value,
                                    }}
                                    title={color.name}
                                    aria-label={`Set background color to ${color.name}`}
                                >
                                    {color.value === "default" && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            A
                                        </span>
                                    )}
                                    {activeHighlightColor === color.value && (
                                        <Check className="h-4 w-4 text-foreground" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Remove Colors Button */}
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            editor.chain().focus().unsetColor().unsetHighlight().run();
                            onOpenChange(false);
                        }}
                    >
                        Remove Colors
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
