"use client";

import { Check, ChevronDown } from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Heading1,
    Heading2,
    Heading3,
    TextQuote,
    ListOrdered,
    List,
    Code,
    Text,
    CheckSquare,
} from "lucide-react";

/**
 * Interface for node selector props
 */
export interface NodeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Interface for node type items
 */
interface NodeTypeItem {
    name: string;
    icon: React.ReactNode;
    command: (editor: NonNullable<ReturnType<typeof useEditor>["editor"]>) => void;
    isActive: (editor: NonNullable<ReturnType<typeof useEditor>["editor"]>) => boolean;
}

/**
 * NodeSelector Component
 * 
 * A dropdown selector for changing block types in the editor.
 * Provides options for paragraph, headings (1-3), lists, quote, code, and task list.
 * 
 * Features:
 * - Visual indication of current block type with icon
 * - Keyboard navigation support
 * - Checkmark for active block type
 * - Converts current block to selected type
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 * 
 * @param props - Component props
 * @returns Rendered node selector
 */
export const NodeSelector = ({ open, onOpenChange }: NodeSelectorProps) => {
    const { editor } = useEditor();

    if (!editor) return null;

    /**
     * Available node types with their icons and commands
     */
    const items: NodeTypeItem[] = [
        {
            name: "Paragraph",
            icon: <Text className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().setParagraph().run(),
            isActive: (editor) =>
                editor.isActive("paragraph") &&
                !editor.isActive("bulletList") &&
                !editor.isActive("orderedList"),
        },
        {
            name: "Heading 1",
            icon: <Heading1 className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            isActive: (editor) => editor.isActive("heading", { level: 1 }),
        },
        {
            name: "Heading 2",
            icon: <Heading2 className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            isActive: (editor) => editor.isActive("heading", { level: 2 }),
        },
        {
            name: "Heading 3",
            icon: <Heading3 className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            isActive: (editor) => editor.isActive("heading", { level: 3 }),
        },
        {
            name: "To-do List",
            icon: <CheckSquare className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleTaskList().run(),
            isActive: (editor) => editor.isActive("taskItem"),
        },
        {
            name: "Bullet List",
            icon: <List className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleBulletList().run(),
            isActive: (editor) => editor.isActive("bulletList"),
        },
        {
            name: "Numbered List",
            icon: <ListOrdered className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleOrderedList().run(),
            isActive: (editor) => editor.isActive("orderedList"),
        },
        {
            name: "Quote",
            icon: <TextQuote className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleBlockquote().run(),
            isActive: (editor) => editor.isActive("blockquote"),
        },
        {
            name: "Code",
            icon: <Code className="h-4 w-4" />,
            command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
            isActive: (editor) => editor.isActive("codeBlock"),
        },
    ];

    /**
     * Get the currently active node type
     */
    const activeItem = items.find((item) => item.isActive(editor)) || items[0];

    return (
        <Popover modal={true} open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 rounded-none border-none hover:bg-accent focus:ring-0"
                    aria-label="Change block type"
                >
                    {activeItem.icon}
                    <span className="text-sm">{activeItem.name}</span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                sideOffset={5}
                align="start"
                className="w-48 p-1"
            >
                {items.map((item) => (
                    <EditorBubbleItem
                        key={item.name}
                        onSelect={() => {
                            item.command(editor);
                            onOpenChange(false);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-accent"
                    >
                        <div className="flex items-center space-x-2">
                            <div className="rounded-sm border p-1">
                                {item.icon}
                            </div>
                            <span>{item.name}</span>
                        </div>
                        {item.isActive(editor) && <Check className="h-4 w-4" />}
                    </EditorBubbleItem>
                ))}
            </PopoverContent>
        </Popover>
    );
};
