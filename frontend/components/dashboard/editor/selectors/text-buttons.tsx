"use client";

import { Bold, Italic, Underline, Strikethrough, Code } from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Interface for a text formatting button
 */
interface TextButton {
    name: string;
    icon: React.ReactNode;
    command: (editor: ReturnType<typeof useEditor>["editor"]) => void;
    isActive: (editor: ReturnType<typeof useEditor>["editor"]) => boolean;
    shortcut: string;
}

/**
 * TextButtons Component
 * 
 * A toolbar with buttons for common text formatting options.
 * Provides quick access to bold, italic, underline, strikethrough, and code formatting.
 * 
 * Features:
 * - Toggle formatting on/off
 * - Visual indication of active formatting (highlighted button)
 * - Keyboard shortcut hints in tooltips
 * - Accessible with ARIA labels
 * - Works with text selection
 * 
 * Requirements: 2.1, 2.2
 * 
 * @returns Rendered text formatting buttons
 */
export const TextButtons = () => {
    const { editor } = useEditor();

    if (!editor) return null;

    /**
     * Available text formatting buttons with their commands and shortcuts
     */
    const buttons: TextButton[] = [
        {
            name: "Bold",
            icon: <Bold className="h-4 w-4" />,
            command: (editor) => editor?.chain().focus().toggleBold().run(),
            isActive: (editor) => editor?.isActive("bold") ?? false,
            shortcut: "⌘B",
        },
        {
            name: "Italic",
            icon: <Italic className="h-4 w-4" />,
            command: (editor) => editor?.chain().focus().toggleItalic().run(),
            isActive: (editor) => editor?.isActive("italic") ?? false,
            shortcut: "⌘I",
        },
        {
            name: "Underline",
            icon: <Underline className="h-4 w-4" />,
            command: (editor) => editor?.chain().focus().toggleUnderline().run(),
            isActive: (editor) => editor?.isActive("underline") ?? false,
            shortcut: "⌘U",
        },
        {
            name: "Strikethrough",
            icon: <Strikethrough className="h-4 w-4" />,
            command: (editor) => editor?.chain().focus().toggleStrike().run(),
            isActive: (editor) => editor?.isActive("strike") ?? false,
            shortcut: "⌘⇧X",
        },
        {
            name: "Code",
            icon: <Code className="h-4 w-4" />,
            command: (editor) => editor?.chain().focus().toggleCode().run(),
            isActive: (editor) => editor?.isActive("code") ?? false,
            shortcut: "⌘E",
        },
    ];

    return (
        <div className="flex items-center">
            {buttons.map((button, index) => (
                <Tooltip key={button.name}>
                    <TooltipTrigger asChild>
                        <EditorBubbleItem
                            onSelect={() => button.command(editor)}
                            asChild
                        >
                            <Button
                                size="sm"
                                variant="ghost"
                                className={cn(
                                    "gap-2 rounded-none border-none hover:bg-accent focus:ring-0",
                                    button.isActive(editor) && "bg-accent"
                                )}
                                aria-label={`Toggle ${button.name.toLowerCase()}`}
                                aria-pressed={button.isActive(editor)}
                            >
                                {button.icon}
                            </Button>
                        </EditorBubbleItem>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="font-medium">{button.name}</p>
                        <p className="text-xs text-muted-foreground">{button.shortcut}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
};
