import { ArrowDownWideNarrow, CheckCheck, RefreshCcwDot, StepForward, WrapText } from "lucide-react";
import { useEditor, getPrevText } from "novel";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";

/**
 * AI command options for text editing and generation
 * Each option represents a different AI operation that can be performed on selected text
 */
const options = [
    {
        value: "improve",
        label: "Improve writing",
        icon: RefreshCcwDot,
    },
    {
        value: "fix",
        label: "Fix grammar",
        icon: CheckCheck,
    },
    {
        value: "shorter",
        label: "Make shorter",
        icon: ArrowDownWideNarrow,
    },
    {
        value: "longer",
        label: "Make longer",
        icon: WrapText,
    },
];

/**
 * AISelectorCommands - Command list for AI operations
 * 
 * This component displays a list of AI commands that can be executed on selected text.
 * It provides options to improve, fix, shorten, or lengthen text, as well as continue writing.
 * 
 * Features:
 * - Define AI command configurations
 * - Implement command execution logic
 * - Call AI API with correct parameters
 * - Extract text from editor selection
 * 
 * Requirements: 11.3
 */

interface AISelectorCommandsProps {
    onSelect: (value: string, option: string) => void;
}

const AISelectorCommands = ({ onSelect }: AISelectorCommandsProps) => {
    const { editor } = useEditor();

    if (!editor) {
        return null;
    }

    return (
        <>
            <CommandList>
                <CommandGroup heading="Edit or review selection">
                    {options.map((option) => (
                        <CommandItem
                            onSelect={(value) => {
                                // Extract selected text as markdown
                                const slice = editor.state.selection.content();
                                const text = editor.storage.markdown.serializer.serialize(slice.content);
                                onSelect(text, value);
                            }}
                            className="flex gap-2 px-4"
                            key={option.value}
                            value={option.value}
                        >
                            <option.icon className="h-4 w-4 text-purple-500" />
                            {option.label}
                        </CommandItem>
                    ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Use AI to do more">
                    <CommandItem
                        onSelect={() => {
                            // Get text before cursor for "continue writing" command
                            const pos = editor.state.selection.from;
                            const text = getPrevText(editor, pos);
                            onSelect(text, "continue");
                        }}
                        value="continue"
                        className="gap-2 px-4"
                    >
                        <StepForward className="h-4 w-4 text-purple-500" />
                        Continue writing
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </>
    );
};

export default AISelectorCommands;
