import StarterKit from '@tiptap/starter-kit';
import {
    TiptapLink,
    UpdatedImage,
    TaskList,
    TaskItem,
    HorizontalRule,
    CharacterCount,
    TiptapUnderline,
    TextStyle,
    Color,
    CustomKeymap,
    Placeholder,
    HighlightExtension,
} from 'novel';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import { DragAndDrop } from './drag-handle';

/**
 * Core extensions configuration for the Novel editor
 * Heavy extensions (AI, Math, Media) are loaded lazily via extensions-lazy.ts
 * Requirements: 19.4
 */
export const coreExtensions = [
    // Core editing functionality with custom HTML attributes
    StarterKit.configure({
        bulletList: {
            HTMLAttributes: {
                class: 'list-disc list-outside leading-3 -mt-2',
            },
        },
        orderedList: {
            HTMLAttributes: {
                class: 'list-decimal list-outside leading-3 -mt-2',
            },
        },
        listItem: {
            HTMLAttributes: {
                class: 'leading-normal -mb-2',
            },
        },
        blockquote: {
            HTMLAttributes: {
                class: 'border-l-4 border-primary',
            },
        },
        code: {
            HTMLAttributes: {
                class: 'rounded-md bg-muted px-1.5 py-1 font-mono font-medium',
            },
        },
        horizontalRule: false, // Using custom HorizontalRule extension instead
        dropcursor: {
            color: '#DBEAFE',
            width: 4,
        },
        gapcursor: false,
    }),

    // Dynamic placeholder text based on node type
    Placeholder.configure({
        placeholder: ({ node }: { node: any }) => {
            if (node.type.name === 'heading') {
                return `Heading ${node.attrs.level}`;
            }
            return "Press '/' for commands, or double click in text for more styling options.";
        },
        includeChildren: true,
    }),

    // Link extension with custom styling
    TiptapLink.configure({
        HTMLAttributes: {
            class:
                'text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer',
        },
    }),

    // Image extension with rounded borders
    UpdatedImage.configure({
        HTMLAttributes: {
            class: 'rounded-lg border border-muted',
        },
    }),

    // Task list with proper styling
    TaskList.configure({
        HTMLAttributes: {
            class: 'not-prose pl-2',
        },
    }),

    // Task item with proper styling
    TaskItem.configure({
        HTMLAttributes: {
            class: 'flex gap-2 items-start my-4',
        },
        nested: true,
    }),

    // Horizontal rule with custom styling
    HorizontalRule.configure({
        HTMLAttributes: {
            class: 'mt-4 mb-6 border-t border-muted-foreground',
        },
    }),

    // Character count for word count display
    CharacterCount,

    // Underline text formatting
    TiptapUnderline,

    // Highlight/background color
    HighlightExtension,

    // Text style for color support
    TextStyle,

    // Text color
    Color,

    // Custom keyboard shortcuts
    CustomKeymap,

    // Custom drag and drop with proper positioning
    // Replaces GlobalDragHandle with a version that handles modals and line height correctly
    DragAndDrop.configure({
        dragHandleWidth: 24,
    }),

    AutoJoiner.configure({
        elementsToJoin: ["bulletList", "orderedList"]
    }),


];

/**
 * Legacy export for backward compatibility
 * @deprecated Use coreExtensions instead and load heavy extensions lazily
 */
export const defaultExtensions = coreExtensions;
