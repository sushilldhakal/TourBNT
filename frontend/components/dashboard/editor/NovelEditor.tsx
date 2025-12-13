"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { EditorRoot, EditorContent, type JSONContent, EditorInstance, EditorCommand, EditorCommandEmpty, EditorCommandList, ImageResizer, handleCommandNavigation, handleImagePaste, handleImageDrop } from "novel";
import { useDebouncedCallback } from "use-debounce";
import { coreExtensions } from "./extensions";
import { getLazyExtensions } from "./extensions-lazy";
import { uploadFn } from "./image-upload";
import { slashCommand, suggestionItems } from "./slash-command";
import CustomEditorCommandItem from "./CustomEditorCommandItem";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { NodeSelector } from "./selectors/node-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { TextButtons } from "./selectors/text-buttons";
import { ColorSelector } from "./selectors/color-selector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import NovelEditorErrorBoundary from "./NovelEditorErrorBoundary";
import { safeParseJSONContent, createEmptyDocument, sanitizeJSONContent } from "./content-parser";

import '../../../app/editor.css';
/**
 * Props interface for NovelEditor component
 */
export interface NovelEditorProps {
    /** Initial content as JSONContent structure */
    initialValue: JSONContent | null;
    /** Callback when content changes (debounced) */
    onContentChange: (content: JSONContent) => void;
    /** Placeholder text for empty editor */
    placeholder?: string;
    /** Minimum height of the editor */
    minHeight?: string;
    /** Enable AI features (optional) */
    enableAI?: boolean;
    /** Enable gallery integration (optional) */
    enableGallery?: boolean;
}

/**
 * NovelEditor Component (Core)
 * 
 * A rich text editor built on Novel/Tiptap with premium features including:
 * - Rich text formatting (bold, italic, underline, etc.)
 * - Block types (headings, lists, quotes, code)
 * - Image upload with drag & drop and paste support
 * - Mathematical expressions with KaTeX
 * - Embedded media (YouTube, Twitter)
 * - Slash command menu
 * - AI-powered writing assistance (optional)
 * - Gallery integration (optional)
 * 
 * Features:
 * - Debounced content updates (500ms) for performance
 * - Save status indicator
 * - Word count display
 * - Image resizing
 * - Keyboard shortcuts (via CustomKeymap extension):
 *   - Cmd/Ctrl+B: Bold
 *   - Cmd/Ctrl+I: Italic
 *   - Cmd/Ctrl+U: Underline
 *   - Cmd/Ctrl+K: Link
 *   - Cmd/Ctrl+Z: Undo
 * - Dark mode support
 * 
 * Requirements: 1.3, 1.4, 1.5, 8.1, 8.2, 8.5, 12.1, 12.2, 12.3, 17.1, 17.2, 17.3, 17.4, 17.5
 * 
 * @param props - Component props
 * @returns Rendered editor
 */
function NovelEditorCore({
    initialValue,
    onContentChange,
    placeholder = "Press '/' for commands...",
    minHeight = "300px",
    enableAI = false,
    enableGallery = true,
}: NovelEditorProps) {
    // Editor state
    const [initialContent, setInitialContent] = useState<JSONContent | undefined>(undefined);
    const [saveStatus, setSaveStatus] = useState<"Saved" | "Unsaved" | "Saving">("Saved");
    const [charsCount, setCharsCount] = useState<number | undefined>(undefined);
    const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
    const [extensions, setExtensions] = useState<any[]>(coreExtensions);
    const [extensionsLoaded, setExtensionsLoaded] = useState(false);

    // Dialog states for selectors
    const [openNode, setOpenNode] = useState(false);
    const [openColor, setOpenColor] = useState(false);
    const [openLink, setOpenLink] = useState(false);
    const [openAI, setOpenAI] = useState(false);

    // Gallery dialog state
    const [dialogOpen, setDialogOpen] = useState(false);

    /**
     * Content cache to avoid repeated parsing of the same content
     * Requirements: 19.1
     */
    const contentCache = useRef<{
        raw: string | null;
        parsed: JSONContent | null;
    }>({
        raw: null,
        parsed: null,
    });

    /**
     * Lazy load heavy extensions based on feature flags
     * Requirements: 19.4
     */
    useEffect(() => {
        const loadExtensions = async () => {
            try {
                // Load lazy extensions based on feature flags
                const lazyExts = await getLazyExtensions({
                    enableAI,
                    enableMath: true, // Always enable math for now
                    enableMedia: true, // Always enable media for now
                });

                // Combine core and lazy extensions
                setExtensions([...coreExtensions, ...lazyExts]);
                setExtensionsLoaded(true);
            } catch (error) {
                console.error('Failed to load extensions:', error);
                // Fall back to core extensions only
                setExtensions(coreExtensions);
                setExtensionsLoaded(true);

                toast({
                    title: 'Feature Loading Warning',
                    description: 'Some editor features failed to load. Basic editing is still available.',
                    variant: 'default',
                    duration: 5000,
                });
            }
        };

        loadExtensions();
    }, [enableAI]);

    /**
     * Initialize editor content from props with safe parsing and caching
     * Includes error handling for malformed content
     * Requirements: 19.1, 20.2
     */
    useEffect(() => {
        if (initialValue) {
            try {
                // Validate and sanitize content
                if (typeof initialValue === 'string') {
                    // Check cache first to avoid repeated parsing
                    if (contentCache.current.raw === initialValue && contentCache.current.parsed) {
                        setInitialContent(contentCache.current.parsed);
                        return;
                    }

                    // Parse string content
                    const parseResult = safeParseJSONContent(initialValue, 'editor content');

                    if (parseResult.success && parseResult.data) {
                        // Sanitize content to remove potentially malicious elements
                        const sanitized = sanitizeJSONContent(parseResult.data);

                        // Update cache
                        contentCache.current = {
                            raw: initialValue,
                            parsed: sanitized,
                        };

                        setInitialContent(sanitized);
                    } else {
                        console.error('Failed to parse initial content:', parseResult.error);
                        toast({
                            title: 'Content Loading Error',
                            description: 'Failed to load editor content. Starting with empty editor.',
                            variant: 'destructive',
                            duration: 5000,
                        });
                        setInitialContent(createEmptyDocument());
                    }
                } else {
                    // Already an object, check cache by stringifying
                    const stringified = JSON.stringify(initialValue);

                    if (contentCache.current.raw === stringified && contentCache.current.parsed) {
                        setInitialContent(contentCache.current.parsed);
                        return;
                    }

                    // Sanitize content
                    const sanitized = sanitizeJSONContent(initialValue);

                    // Update cache
                    contentCache.current = {
                        raw: stringified,
                        parsed: sanitized,
                    };

                    setInitialContent(sanitized);
                }
            } catch (error) {
                console.error('Error initializing editor content:', error);
                toast({
                    title: 'Content Loading Error',
                    description: 'An unexpected error occurred. Starting with empty editor.',
                    variant: 'destructive',
                    duration: 5000,
                });
                setInitialContent(createEmptyDocument());
            }
        } else {
            // Empty document structure
            setInitialContent(createEmptyDocument());
        }
    }, [initialValue]);

    /**
     * Debounced callback for content changes
     * Waits 500ms after last change before calling onContentChange
     * This optimizes performance by reducing excessive updates
     */
    const debouncedUpdates = useDebouncedCallback(
        async (editor: EditorInstance) => {
            const json = editor.getJSON();

            // Update character count
            const characterCount = editor.storage.characterCount;
            if (characterCount) {
                setCharsCount(characterCount.characters());
            }

            // Call the parent's onChange callback
            onContentChange(json);

            // Update save status
            setSaveStatus("Saved");
        },
        500
    );

    /**
     * Handle editor updates
     * Called on every content change
     */
    const handleUpdate = useCallback(
        (editor: EditorInstance) => {
            setSaveStatus("Unsaved");
            debouncedUpdates(editor);
        },
        [debouncedUpdates]
    );

    /**
     * Handle editor creation
     * Store the editor instance for later use
     */
    const handleCreate = useCallback((editor: EditorInstance) => {
        setEditorInstance(editor);

        // Initialize character count
        const characterCount = editor.storage.characterCount;
        if (characterCount) {
            setCharsCount(characterCount.characters());
        }
    }, []);

    /**
     * Handle image selection from gallery
     * Inserts the selected image at the cursor position and removes the "/gallery" command text
     */
    const handleImageSelect = useCallback(
        (image: string | string[] | null) => {
            const imageUrl = Array.isArray(image) ? image[0] : image || "";

            if (editorInstance && imageUrl) {
                const { schema, view } = editorInstance;
                const { dispatch, state } = view;
                const { $from } = state.selection;

                // Find the position of the "/gallery" command text
                const commandStart = $from.pos - "/gallery".length;

                // Create image node
                const imageNode = schema.nodes.image.create({ src: imageUrl });

                // Insert image and remove command text
                dispatch(
                    state.tr
                        .insert($from.pos, imageNode)
                        .deleteRange(commandStart, $from.pos)
                );

                // Close the dialog
                setDialogOpen(false);
            }
        },
        [editorInstance]
    );

    if (initialContent === undefined || !extensionsLoaded) {
        return (
            <div className="relative w-full min-h-[300px] p-4 border-muted bg-background sm:rounded-lg sm:border sm:shadow-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Loading editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full">
            <EditorRoot>
                <EditorContent
                    initialContent={initialContent}
                    extensions={[...extensions, slashCommand]}
                    className={cn(
                        "relative min-h-[300px] pl-4 w-full border-muted bg-background sm:rounded-lg sm:border sm:shadow-lg",
                        minHeight && `min-h-[${minHeight}]`
                    )}
                    editorProps={{
                        handleDOMEvents: {
                            keydown: (_view, event) => handleCommandNavigation(event),
                        },
                        handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
                        handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
                        attributes: {
                            class: cn(
                                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
                                "prose-a:text-muted-foreground prose-a:underline prose-a:underline-offset-[3px] hover:prose-a:text-primary prose-a:transition-colors",
                                "prose-pre:bg-muted prose-pre:text-foreground",
                                "prose-code:bg-muted prose-code:text-foreground prose-code:rounded-md prose-code:px-1.5 prose-code:py-1",
                                "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
                                "prose-hr:border-muted-foreground",
                                "prose-ul:list-disc prose-ol:list-decimal",
                                "prose-li:marker:text-muted-foreground",
                                "prose-img:rounded-lg prose-img:border prose-img:border-muted"
                            ),
                        },
                    }}
                    onUpdate={({ editor }) => handleUpdate(editor as EditorInstance)}
                    onCreate={({ editor }) => handleCreate(editor as EditorInstance)}
                    slotAfter={<ImageResizer />}
                >
                    {/* Slash command menu */}
                    <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
                        <EditorCommandEmpty className="px-2 text-muted-foreground">
                            No results
                        </EditorCommandEmpty>
                        <EditorCommandList>
                            {suggestionItems.map((item) => (
                                <CustomEditorCommandItem
                                    value={item.title}
                                    onCommand={(val) => {
                                        // Special handling for Gallery Image command
                                        if (item.title === "Gallery Image") {
                                            if (enableGallery) {
                                                setDialogOpen(true);
                                            }
                                        } else if (item.command) {
                                            item.command(val);
                                        }
                                    }}
                                    onEnterPress={() => {
                                        // Special handling for Gallery Image when Enter is pressed
                                        if (item.title === "Gallery Image" && enableGallery) {
                                            setDialogOpen(true);
                                        }
                                    }}
                                    className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                                    key={item.title}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.description}
                                        </p>
                                    </div>
                                </CustomEditorCommandItem>
                            ))}
                        </EditorCommandList>
                    </EditorCommand>

                    {/* Generative menu switch with selectors */}
                    {enableAI ? (
                        <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
                            <Separator orientation="vertical" />
                            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                            <Separator orientation="vertical" />
                            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                            <Separator orientation="vertical" />
                            <MathSelector />
                            <Separator orientation="vertical" />
                            <TextButtons />
                            <Separator orientation="vertical" />
                            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
                        </GenerativeMenuSwitch>
                    ) : (
                        <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
                            <Separator orientation="vertical" />
                            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                            <Separator orientation="vertical" />
                            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                            <Separator orientation="vertical" />
                            <MathSelector />
                            <Separator orientation="vertical" />
                            <TextButtons />
                            <Separator orientation="vertical" />
                            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
                        </GenerativeMenuSwitch>
                    )}
                </EditorContent>
            </EditorRoot>

            {/* Status indicators */}
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "inline-flex items-center gap-1",
                        saveStatus === "Saved" && "text-green-600 dark:text-green-400",
                        saveStatus === "Unsaved" && "text-yellow-600 dark:text-yellow-400",
                        saveStatus === "Saving" && "text-blue-600 dark:text-blue-400"
                    )}>
                        <span className={cn(
                            "h-2 w-2 rounded-full",
                            saveStatus === "Saved" && "bg-green-600 dark:bg-green-400",
                            saveStatus === "Unsaved" && "bg-yellow-600 dark:bg-yellow-400",
                            saveStatus === "Saving" && "bg-blue-600 dark:bg-blue-400 animate-pulse"
                        )} />
                        {saveStatus}
                    </span>
                </div>

                {charsCount !== undefined && (
                    <div className="flex items-center gap-1">
                        <span>{charsCount} characters</span>
                    </div>
                )}
            </div>

            {/* Gallery Dialog */}
            {enableGallery && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Select Image from Gallery</DialogTitle>
                            <DialogDescription>
                                Choose an image from your gallery to insert into the editor.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="p-4">
                            {/* TODO: Integrate with actual gallery component */}
                            {/* For now, provide a simple URL input as a placeholder */}
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Gallery integration will be completed in a future update.
                                    For now, you can enter an image URL directly:
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        id="gallery-image-url"
                                        type="text"
                                        placeholder="https://example.com/image.jpg"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                const input = e.target as HTMLInputElement;
                                                handleImageSelect(input.value);
                                                input.value = "";
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={() => {
                                            const input = document.getElementById("gallery-image-url") as HTMLInputElement;
                                            if (input && input.value) {
                                                handleImageSelect(input.value);
                                                input.value = "";
                                            }
                                        }}
                                    >
                                        Insert
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

/**
 * NovelEditor with Error Boundary
 * 
 * Wraps the core NovelEditor component with an error boundary
 * to catch and handle editor initialization errors gracefully.
 * 
 * Provides a fallback textarea when the editor fails to load,
 * preventing data loss and allowing users to continue editing.
 * 
 * Requirements: 20.3
 */
export default function NovelEditor(props: NovelEditorProps) {
    const [fallbackValue, setFallbackValue] = useState('');

    // Convert JSONContent to string for fallback
    useEffect(() => {
        if (props.initialValue) {
            try {
                setFallbackValue(JSON.stringify(props.initialValue, null, 2));
            } catch (e) {
                console.error('Error stringifying initial value:', e);
                setFallbackValue('');
            }
        }
    }, [props.initialValue]);

    const handleFallbackChange = (value: string) => {
        setFallbackValue(value);
        try {
            const parsed = JSON.parse(value);
            props.onContentChange(parsed);
        } catch (e) {
            // Invalid JSON, don't update
            console.error('Invalid JSON in fallback:', e);
        }
    };

    return (
        <NovelEditorErrorBoundary
            fallbackValue={fallbackValue}
            onFallbackChange={handleFallbackChange}
        >
            <NovelEditorCore {...props} />
        </NovelEditorErrorBoundary>
    );
}
