"use client";

import { Check, Trash, ExternalLink } from "lucide-react";
import { useEditor } from "novel";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Interface for link selector props
 */
export interface LinkSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Validates if a string is a valid URL
 * 
 * @param url - The URL string to validate
 * @returns true if valid URL, false otherwise
 */
export const isValidUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ["http:", "https:"].includes(parsed.protocol);
    } catch {
        return false;
    }
};

/**
 * LinkSelector Component
 * 
 * A popover for creating and editing links in the editor.
 * Provides URL input, validation, and link management.
 * 
 * Features:
 * - URL input field with validation
 * - Visual feedback for valid/invalid URLs
 * - Edit existing links
 * - Remove link button
 * - Link preview with external link icon
 * - Auto-focus on input when opened
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * @param props - Component props
 * @returns Rendered link selector
 */
export const LinkSelector = ({ open, onOpenChange }: LinkSelectorProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { editor } = useEditor();
    const [url, setUrl] = useState<string>("");

    // Get the current link URL when the popover opens
    useEffect(() => {
        if (open && editor) {
            const previousUrl = editor.getAttributes("link").href || "";
            setUrl(previousUrl);
        }
    }, [open, editor]);

    // Auto-focus the input when popover opens
    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        }
    }, [open]);

    if (!editor) return null;

    /**
     * Handle setting or updating the link
     */
    const handleSetLink = () => {
        if (!url) {
            editor.chain().focus().unsetLink().run();
            onOpenChange(false);
            return;
        }

        // Add https:// if no protocol is specified
        let finalUrl = url;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            finalUrl = `https://${url}`;
        }

        if (isValidUrl(finalUrl)) {
            editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: finalUrl })
                .run();
            onOpenChange(false);
        }
    };

    /**
     * Handle removing the link
     */
    const handleRemoveLink = () => {
        editor.chain().focus().unsetLink().run();
        setUrl("");
        onOpenChange(false);
    };

    /**
     * Handle Enter key to set link
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSetLink();
        }
    };

    const isValid = !url || isValidUrl(url) || isValidUrl(`https://${url}`);

    return (
        <Popover modal={true} open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 rounded-none border-none hover:bg-accent focus:ring-0"
                    aria-label="Add or edit link"
                >
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-sm">Link</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-80 p-3"
                sideOffset={5}
            >
                <div className="flex flex-col space-y-3">
                    <div className="space-y-1">
                        <label htmlFor="url-input" className="text-sm font-medium">
                            URL
                        </label>
                        <div className="flex items-center space-x-2">
                            <Input
                                id="url-input"
                                ref={inputRef}
                                type="text"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className={cn(
                                    "flex-1",
                                    !isValid && "border-destructive focus-visible:ring-destructive/20"
                                )}
                                aria-invalid={!isValid}
                            />
                        </div>
                        {!isValid && (
                            <p className="text-xs text-destructive">
                                Please enter a valid URL
                            </p>
                        )}
                    </div>

                    {/* Link preview if URL exists and is valid */}
                    {url && isValid && (
                        <div className="rounded-md bg-muted p-2">
                            <div className="flex items-center space-x-2">
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">
                                    {url.startsWith("http") ? url : `https://${url}`}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRemoveLink}
                            className="gap-2"
                            disabled={!editor.getAttributes("link").href}
                        >
                            <Trash className="h-3 w-3" />
                            Remove
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSetLink}
                            disabled={!isValid}
                            className="gap-2"
                        >
                            <Check className="h-3 w-3" />
                            {editor.getAttributes("link").href ? "Update" : "Add"} Link
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};
