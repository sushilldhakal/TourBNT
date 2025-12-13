import { Command, CommandInput } from "@/components/ui/command";
import { ArrowUp } from "lucide-react";
import { useEditor, addAIHighlight } from "novel";
import { useState } from "react";
import Markdown from "react-markdown";
import AICompletionCommands from "./ai-completion-command";
import AISelectorCommands from "./ai-selector-commands";
import { ScrollArea } from "@/components/ui/scroll-area";
import Magic from "../icons/Magic";
import CrazySpinner from "../icons/CrazySpinner";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { generateCompletion } from "@/lib/api/aiApi";
import { toast } from "@/components/ui/use-toast";

/**
 * AISelector - AI command menu interface
 * 
 * This component provides the main interface for AI-powered text editing.
 * It displays AI command options, handles command selection, shows loading states,
 * and displays AI-generated completions.
 * 
 * Features:
 * - Create AI command menu
 * - Display AI command options (continue, improve, fix, shorter, longer)
 * - Handle command selection
 * - Show loading state during AI processing
 * - Display AI-generated completions with markdown rendering
 * - Allow follow-up commands on completions
 * 
 * Requirements: 11.2, 11.3, 11.4
 */

interface AISelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
    const { editor } = useEditor();
    const [inputValue, setInputValue] = useState("");

    // Mutation for AI completion generation
    const { mutate: complete, data: completion, isPending } = useMutation({
        mutationFn: generateCompletion,
        onSuccess: (data) => {
            if (data.completion) {
                toast({
                    title: "AI Completion",
                    description: <Markdown>{data.completion}</Markdown>,
                    duration: 9000,
                });
            }
        },
        onError: (error: any) => {
            if (error.response && error.response.status === 429) {
                toast({
                    title: "Rate limit exceeded",
                    description: "You have reached your request limit for the day.",
                    variant: "destructive",
                    duration: 9000,
                });
            } else {
                toast({
                    title: "Something went wrong",
                    description: error.message || 'Internal Server Error',
                    variant: "destructive",
                    duration: 9000,
                });
            }
        }
    });

    const hasCompletion = completion && completion.completion && completion.completion.length > 0;

    return (
        <Command className="w-[350px]">
            {/* Display AI completion if available */}
            {hasCompletion && (
                <div className="flex max-h-[400px]">
                    <ScrollArea>
                        <div className="prose p-2 px-4 prose-sm">
                            <Markdown>{completion.completion}</Markdown>
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Show loading state during AI processing */}
            {isPending && (
                <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground text-purple-500">
                    <Magic className="mr-2 h-4 w-4 shrink-0" />
                    AI is thinking
                    <div className="ml-2 mt-1">
                        <CrazySpinner />
                    </div>
                </div>
            )}

            {/* Show input and commands when not loading */}
            {!isPending && (
                <>
                    <div className="relative">
                        <CommandInput
                            value={inputValue}
                            onValueChange={setInputValue}
                            autoFocus
                            placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
                            onFocus={() => {
                                if (editor) {
                                    addAIHighlight(editor);
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-900"
                            onClick={(e) => {
                                e.preventDefault();

                                // If we have a completion, use it as the prompt for follow-up commands
                                if (completion) {
                                    complete({ prompt: completion.completion, option: "zap", command: inputValue });
                                    setInputValue("");
                                    return;
                                }

                                // Otherwise, use the selected text as the prompt
                                if (!editor) {
                                    toast({
                                        title: "Something went wrong",
                                        description: "Editor is not available",
                                        variant: "destructive",
                                    });
                                    return;
                                }

                                const slice = editor.state.selection.content();
                                const text = editor.storage.markdown.serializer.serialize(slice.content);

                                complete({ prompt: text, option: "zap", command: inputValue });
                                setInputValue("");
                            }}
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Show completion actions or command list */}
                    {hasCompletion ? (
                        <AICompletionCommands
                            onDiscard={() => {
                                if (editor) {
                                    editor.chain().unsetHighlight().focus().run();
                                }
                                onOpenChange(false);
                            }}
                            completion={completion.completion}
                        />
                    ) : (
                        <AISelectorCommands onSelect={(value, option) => complete({ prompt: value, option })} />
                    )}
                </>
            )}
        </Command>
    );
}
