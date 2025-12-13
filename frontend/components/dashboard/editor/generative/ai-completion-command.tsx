import { CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useEditor } from "novel";
import { Check, TextQuote, TrashIcon } from "lucide-react";

/**
 * AICompletionCommands - Actions for AI-generated completions
 * 
 * This component displays action options after AI generates a completion.
 * Users can choose to replace the selection, insert below, or discard the completion.
 * 
 * Features:
 * - Replace selected text with AI completion
 * - Insert AI completion below selection
 * - Discard AI completion
 */

interface AICompletionCommandsProps {
    completion: string;
    onDiscard: () => void;
}

const AICompletionCommands = ({ completion, onDiscard }: AICompletionCommandsProps) => {
    const { editor } = useEditor();

    if (!editor) {
        return null;
    }

    return (
        <>
            <CommandList>
                <CommandGroup>
                    <CommandItem
                        className="gap-2 px-4"
                        value="replace"
                        onSelect={() => {
                            const selection = editor.view.state.selection;

                            editor
                                .chain()
                                .focus()
                                .insertContentAt(
                                    {
                                        from: selection.from,
                                        to: selection.to,
                                    },
                                    completion,
                                )
                                .run();
                        }}
                    >
                        <Check className="h-4 w-4 text-muted-foreground" />
                        Replace selection
                    </CommandItem>
                    <CommandItem
                        className="gap-2 px-4"
                        value="insert"
                        onSelect={() => {
                            const selection = editor.view.state.selection;
                            editor
                                .chain()
                                .focus()
                                .insertContentAt(selection.to + 1, completion)
                                .run();
                        }}
                    >
                        <TextQuote className="h-4 w-4 text-muted-foreground" />
                        Insert below
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />

                <CommandGroup>
                    <CommandItem onSelect={onDiscard} value="thrash" className="gap-2 px-4">
                        <TrashIcon className="h-4 w-4 text-muted-foreground" />
                        Discard
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </>
    );
};

export default AICompletionCommands;
