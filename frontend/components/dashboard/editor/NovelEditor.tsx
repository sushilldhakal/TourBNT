"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { EditorRoot, EditorContent, type JSONContent, EditorInstance, EditorCommand, EditorCommandEmpty, EditorCommandList, ImageResizer, handleCommandNavigation, handleImagePaste, handleImageDrop } from "novel";
import { useDebouncedCallback } from "use-debounce";
import { createCoreExtensions } from "./extensions";
import type { AnyExtension } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";
import { getLazyExtensions } from "./extensions-lazy";
import { createUploadFn } from "./image-upload";
import { useAuth } from '@/lib/hooks/useAuth';
import { slashCommand, suggestionItems } from "./slash-command";
import CustomEditorCommandItem from "./CustomEditorCommandItem";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { NodeSelector } from "./selectors/node-selector";
import { LinkSelector } from "./selectors/link-selector";
import { TextButtons } from "./selectors/text-buttons";
import { ColorSelector } from "./selectors/color-selector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import NovelEditorErrorBoundary from "./NovelEditorErrorBoundary";
import { safeParseJSONContent, createEmptyDocument, sanitizeJSONContent } from "./content-parser";
import { Gallery } from "../gallery/Gallery";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import '../../../app/editor.css';

export interface NovelEditorProps {
    initialValue: JSONContent | null;
    onContentChange: (content: JSONContent) => void;
    placeholder?: string;
    minHeight?: string;
    enableAI?: boolean;
    enableGallery?: boolean;
}

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
    // Core extensions (with this editor's placeholder) plus the heavy ones loaded on demand.
    const baseExtensions = useMemo(() => createCoreExtensions(placeholder), [placeholder]);
    const [lazyExtensions, setLazyExtensions] = useState<AnyExtension[]>([]);
    const [extensionsLoaded, setExtensionsLoaded] = useState(false);

    // Dialog states - wrapped in useRef to prevent re-renders
    const [openNode, setOpenNode] = useState(false);
    const [openColor, setOpenColor] = useState(false);
    const [openLink, setOpenLink] = useState(false);
    const [openAI, setOpenAI] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const { user } = useAuth();

    const contentCache = useRef<{
        raw: string | null;
        parsed: JSONContent | null;
    }>({
        raw: null,
        parsed: null,
    });

    // Store initial content processing flag to prevent re-processing
    const contentInitialized = useRef(false);

    /**
     * FIX 1: Memoize extensions to prevent recreation on every render
     */
    const memoizedExtensions = useMemo(() => [...baseExtensions, ...lazyExtensions], [baseExtensions, lazyExtensions]);

    /**
     * FIX 2: Load extensions only once
     */
    useEffect(() => {
        if (extensionsLoaded) return; // Prevent reloading

        const loadExtensions = async () => {
            try {
                const lazyExts = await getLazyExtensions({
                    enableAI,
                    enableMedia: true,
                });

                setLazyExtensions(lazyExts);
                setExtensionsLoaded(true);
            } catch (error) {
                console.error('Failed to load extensions:', error);
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
    }, [enableAI, extensionsLoaded]);

    /**
     * FIX 3: Initialize content only once, prevent re-initialization
     */
    useEffect(() => {
        if (contentInitialized.current) return;

        if (initialValue) {
            try {
                if (typeof initialValue === 'string') {
                    if (contentCache.current.raw === initialValue && contentCache.current.parsed) {
                        setInitialContent(contentCache.current.parsed);
                        contentInitialized.current = true;
                        return;
                    }

                    const parseResult = safeParseJSONContent(initialValue, 'editor content');

                    if (parseResult.success && parseResult.data) {
                        const sanitized = sanitizeJSONContent(parseResult.data);

                        contentCache.current = {
                            raw: initialValue,
                            parsed: sanitized,
                        };

                        setInitialContent(sanitized);
                        contentInitialized.current = true;
                    } else {
                        console.error('Failed to parse initial content:', parseResult.error);
                        toast({
                            title: 'Content Loading Error',
                            description: 'Failed to load editor content. Starting with empty editor.',
                            variant: 'destructive',
                            duration: 5000,
                        });
                        setInitialContent(createEmptyDocument());
                        contentInitialized.current = true;
                    }
                } else {
                    const stringified = JSON.stringify(initialValue);

                    if (contentCache.current.raw === stringified && contentCache.current.parsed) {
                        setInitialContent(contentCache.current.parsed);
                        contentInitialized.current = true;
                        return;
                    }

                    const sanitized = sanitizeJSONContent(initialValue);

                    contentCache.current = {
                        raw: stringified,
                        parsed: sanitized,
                    };

                    setInitialContent(sanitized);
                    contentInitialized.current = true;
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
                contentInitialized.current = true;
            }
        } else {
            setInitialContent(createEmptyDocument());
            contentInitialized.current = true;
        }
    }, [initialValue]); // Runs once: contentInitialized guards later changes

    /**
     * FIX 4: Optimize debounced updates - don't trigger re-renders
     */
    const debouncedUpdates = useDebouncedCallback(
        async (editor: EditorInstance) => {
            const json = editor.getJSON();

            const characterCount = editor.storage.characterCount;
            if (characterCount) {
                setCharsCount(characterCount.characters());
            }

            onContentChange(json);
            setSaveStatus("Saved");
        },
        500
    );

    /**
     * FIX 5: Memoize callbacks to prevent recreation
     */
    const handleUpdate = useCallback(
        (editor: EditorInstance) => {
            // Don't update state immediately to prevent re-render
            if (saveStatus !== "Unsaved") {
                setSaveStatus("Unsaved");
            }
            debouncedUpdates(editor);
        },
        [debouncedUpdates, saveStatus]
    );

    const handleCreate = useCallback((editor: EditorInstance) => {
        setEditorInstance(editor);

        const characterCount = editor.storage.characterCount;
        if (characterCount) {
            setCharsCount(characterCount.characters());
        }
    }, []);

    /**
     * FIX 6: Memoize image select handler
     */
    const handleImageSelect = useCallback(
        (image: string | string[] | null) => {
            const imageUrl = Array.isArray(image) ? image[0] : image || "";

            if (editorInstance && imageUrl) {
                const { schema, view } = editorInstance;
                const { dispatch, state } = view;
                const { $from } = state.selection;

                const commandStart = $from.pos - "/gallery".length;
                const imageNode = schema.nodes.image.create({ src: imageUrl });

                dispatch(
                    state.tr
                        .insert($from.pos, imageNode)
                        .deleteRange(commandStart, $from.pos)
                );

                setDialogOpen(false);
            }
        },
        [editorInstance]
    );

    /**
     * FIX 7: Memoize editor props to prevent recreation
     */
    const editorProps = useMemo(() => ({
        handleDOMEvents: {
            keydown: (_view: EditorView, event: KeyboardEvent) => handleCommandNavigation(event),
        },
        handlePaste: (view: EditorView, event: ClipboardEvent) => handleImagePaste(view, event, createUploadFn(user?.id || '')),
        handleDrop: (view: EditorView, event: DragEvent, _slice: Slice, moved: boolean) => handleImageDrop(view, event, moved, createUploadFn(user?.id || '')),
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
    }), [user?.id]);

    if (initialContent === undefined || !extensionsLoaded) {
        return (
            <div
                className="relative w-full p-4 border-muted bg-background sm:rounded-lg sm:border sm:shadow-lg flex items-center justify-center"
                style={{ minHeight }}
            >
                <div className="text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Loading editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full" style={{ minHeight }}>
            <EditorRoot>
                <EditorContent
                    initialContent={initialContent}
                    extensions={[...memoizedExtensions, slashCommand]}
                    immediatelyRender={false}
                    className={cn(
                        "relative pl-4 w-full border-muted bg-background sm:rounded-lg sm:border sm:shadow-lg",
                    )}
                    editorProps={editorProps}
                    onUpdate={({ editor }) => handleUpdate(editor as EditorInstance)}
                    // Leaving the editor (e.g. clicking Save) must not wait out the debounce, or the last edits are lost.
                    onBlur={() => debouncedUpdates.flush()}
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
                                        if (item.title === "Gallery Image") {
                                            if (enableGallery) {
                                                setDialogOpen(true);
                                            }
                                        } else if (item.command) {
                                            item.command(val);
                                        }
                                    }}
                                    onEnterPress={() => {
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

                    {/* FIX 9: Memoize menu switch to prevent re-renders */}
                    <MenuSwitch
                        openAI={openAI}
                        setOpenAI={setOpenAI}
                        openNode={openNode}
                        setOpenNode={setOpenNode}
                        openLink={openLink}
                        setOpenLink={setOpenLink}
                        openColor={openColor}
                        setOpenColor={setOpenColor}
                    />
                </EditorContent>
            </EditorRoot>

            {/* FIX 10: Move status indicators outside to prevent affecting editor height */}
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
                    <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] left-1/2 -translate-x-1/2 max-h-[90vh] p-0">
                        <VisuallyHidden>
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle>Select Images from Gallery</DialogTitle>
                                <DialogDescription>
                                    Choose images from your media gallery to add to the editor.
                                </DialogDescription>
                            </DialogHeader>
                        </VisuallyHidden>
                        <div className="h-[calc(90vh-120px)] w-full overflow-y-auto">
                            <Gallery
                                mode="picker"
                                onMediaSelect={handleImageSelect}
                                allowMultiple={false}
                                initialTab="images"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

/**
 * FIX 11: Separate MenuSwitch component to prevent parent re-renders
 */
interface MenuSwitchProps {
    openAI: boolean;
    setOpenAI: (open: boolean) => void;
    openNode: boolean;
    setOpenNode: (open: boolean) => void;
    openLink: boolean;
    setOpenLink: (open: boolean) => void;
    openColor: boolean;
    setOpenColor: (open: boolean) => void;
}

const MenuSwitch = React.memo(({
    openAI,
    setOpenAI,
    openNode,
    setOpenNode,
    openLink,
    setOpenLink,
    openColor,
    setOpenColor
}: MenuSwitchProps) => {
    return (
        <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
        </GenerativeMenuSwitch>
    );
});

MenuSwitch.displayName = 'MenuSwitch';

export default function NovelEditor(props: NovelEditorProps) {
    const { initialValue, onContentChange } = props;
    const [fallbackValue, setFallbackValue] = useState('');

    useEffect(() => {
        if (initialValue) {
            try {
                setTimeout(() => {
                    setFallbackValue(JSON.stringify(initialValue, null, 2));
                }, 0);
            } catch (e) {
                console.error('Error stringifying initial value:', e);
                setTimeout(() => {
                    setFallbackValue('');
                }, 0);
            }
        }
    }, [initialValue]);

    const handleFallbackChange = (value: string) => {
        setFallbackValue(value);
        try {
            const parsed = JSON.parse(value);
            onContentChange(parsed);
        } catch (e) {
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