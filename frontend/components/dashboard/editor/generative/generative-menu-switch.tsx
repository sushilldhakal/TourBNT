import React, { Fragment, useEffect } from 'react';
import { EditorBubble, useEditor, removeAIHighlight } from 'novel';
import { Button } from '@/components/ui/button';
import Magic from '../icons/Magic';
import { AISelector } from './ai-selector';

/**
 * GenerativeMenuSwitch - Floating toolbar for AI features
 * 
 * This component creates a floating toolbar that appears near text selection.
 * It provides access to AI-powered editing features and other text formatting options.
 * 
 * Features:
 * - Positions toolbar near selection
 * - Shows/hides based on text selection
 * - Renders children (selectors) when AI menu is closed
 * - Adds separators between items
 * - Handles AI highlight removal when closed
 * 
 * Requirements: 11.1, 11.2
 */

interface GenerativeMenuSwitchProps {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const GenerativeMenuSwitch = ({ children, open, onOpenChange }: GenerativeMenuSwitchProps) => {
    const { editor } = useEditor();

    // Remove AI highlight when menu is closed
    useEffect(() => {
        if (editor && !open) {
            removeAIHighlight(editor);
        }
    }, [open, editor]);

    const handleOpenChange = () => {
        if (editor && editor.isEditable) {
            onOpenChange(true);
        } else {
            console.error("Editor instance is not available or not editable.", editor);
        }
    };

    return (
        <EditorBubble
            tippyOptions={{
                placement: open ? "bottom-start" : "top",
                onHidden: () => {
                    onOpenChange(false);
                    if (editor) {
                        editor.chain().unsetHighlight().run();
                    }
                },
            }}
            className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
        >
            {open && <AISelector open={open} onOpenChange={onOpenChange} />}
            {!open && (
                <Fragment>
                    <Button
                        className="gap-1 rounded-none text-purple-500"
                        variant="ghost"
                        onClick={handleOpenChange}
                        size="sm"
                    >
                        <Magic className="h-5 w-5" />
                        Ask AI
                    </Button>
                    {children}
                </Fragment>
            )}
        </EditorBubble>
    );
};

export default GenerativeMenuSwitch;
