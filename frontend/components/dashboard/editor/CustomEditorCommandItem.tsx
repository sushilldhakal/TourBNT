import { FC, KeyboardEvent, ReactNode } from 'react';
import { EditorCommandItem as OriginalEditorCommandItem } from 'novel';
import { EditorInstance } from 'novel';
import { Range } from '@tiptap/core';

/**
 * Props interface for CustomEditorCommandItem component
 */
interface CustomEditorCommandItemProps {
    /** The value/identifier for this command item */
    value?: string;
    /** Callback function to execute the command */
    onCommand: ({ editor, range }: { editor: EditorInstance; range: Range }) => void;
    /** Optional callback when Enter key is pressed (used for special cases like Gallery Image) */
    onEnterPress?: () => void;
    /** Optional callback when item is selected */
    onSelect?: (value: string) => void;
    /** CSS class name for styling */
    className: string;
    /** Child elements to render (icon, title, description) */
    children?: ReactNode;
}

/**
 * CustomEditorCommandItem Component
 * 
 * A wrapper around Novel's EditorCommandItem that adds keyboard navigation support
 * and handles special cases like the Gallery Image command.
 * 
 * Features:
 * - Keyboard navigation with Enter key handling
 * - Renders command item with icon and description
 * - Special handling for Gallery Image command via onEnterPress
 * 
 * Usage Example:
 * ```tsx
 * <CustomEditorCommandItem
 *   value="Gallery Image"
 *   onCommand={({ editor, range }) => {
 *     if (item.command) {
 *       item.command({ editor, range });
 *     }
 *   }}
 *   onEnterPress={() => {
 *     // Special handling for Gallery Image
 *     setDialogOpen(true);
 *   }}
 *   className="flex w-full items-center space-x-2 rounded-md px-2 py-1"
 * >
 *   <div className="flex h-10 w-10 items-center justify-center">
 *     {item.icon}
 *   </div>
 *   <div>
 *     <p className="font-medium">{item.title}</p>
 *     <p className="text-xs text-muted-foreground">{item.description}</p>
 *   </div>
 * </CustomEditorCommandItem>
 * ```
 * 
 * @param props - Component props
 * @returns Rendered command item
 */
const CustomEditorCommandItem: FC<CustomEditorCommandItemProps> = ({
    onCommand,
    onEnterPress,
    value,
    onSelect,
    className,
    children,
    ...props
}) => {
    /**
     * Handle keyboard events, specifically Enter key for command execution
     * This is particularly important for the Gallery Image command which needs
     * to open a dialog instead of executing immediately
     */
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (onEnterPress) {
                onEnterPress();
            }
        }
    };

    return (
        <OriginalEditorCommandItem
            {...props}
            onKeyDown={handleKeyDown}
            onCommand={onCommand}
            value={value}
            className={className}
            onSelect={(selectedValue: string) => {
                if (onSelect) {
                    onSelect(selectedValue);
                }
            }}
        >
            {children}
        </OriginalEditorCommandItem>
    );
};

export default CustomEditorCommandItem;
