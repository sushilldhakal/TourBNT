import {
    CheckSquare,
    Code,
    Heading1,
    Heading2,
    Heading3,
    ImageIcon,
    List,
    ListOrdered,
    Text,
    TextQuote,
    Twitter,
    Youtube,
} from "lucide-react";
import { createSuggestionItems, Command, renderItems, type SuggestionItem } from "novel";
import type { Range, Editor } from "@tiptap/core";
import Magic from "./icons/Magic";
import { type JSONContent } from "novel";
import { toast } from "@/components/ui/use-toast";

interface CommandProps {
    editor: Editor;
    range: Range;
}

/**
 * Helper function to extract text content from JSONContent structure
 * Recursively traverses the JSON tree to find text nodes
 */
const extractTextFromJSONContent = (jsonContent: JSONContent): string => {
    let text = '';

    const traverse = (node: any) => {
        if (node.type === 'text' && node.text) {
            text += node.text;
        } else if (node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
                traverse(child);
            }
        }
    };

    traverse(jsonContent);
    return text;
};

/**
 * Suggestion items for the slash command menu
 * Each item represents a command that can be triggered by typing "/" in the editor
 */
export const suggestionItems = createSuggestionItems([
    {
        title: "Continue writing",
        description: "Use AI to expand your thoughts.",
        searchTerms: ["gpt", "ai", "continue"],
        icon: <Magic className="novel-w-7" />,
        command: async ({ editor, range }: CommandProps) => {
            const prompt: JSONContent = editor.getJSON();
            const promptString = extractTextFromJSONContent(prompt);
            editor.chain().focus().deleteRange(range).run();

            try {
                // Note: AI API integration will be implemented in task 12.1
                // For now, this is a placeholder that shows a message
                toast({
                    title: "AI Feature",
                    description: "AI completion will be available once the AI API is configured.",
                    duration: 3000,
                });

                // TODO: Uncomment when AI API is implemented
                // const response = await generateCompletion({
                //   prompt: promptString,
                //   option: 'continue',
                //   command: ''
                // });
                // 
                // const { completion } = response;
                // if (completion) {
                //   editor.chain().focus().insertContent(completion).run();
                // } else {
                //   toast({
                //     title: "No completion received.",
                //     description: "Please try again later.",
                //     variant: "destructive",
                //     duration: 9000,
                //   });
                // }
            } catch (error) {
                toast({
                    title: "An error occurred while generating the text.",
                    description: `Please try again later. ${error}`,
                    variant: "destructive",
                    duration: 9000,
                });
            }
        },
    },
    {
        title: "Text",
        description: "Just start typing with plain text.",
        searchTerms: ["p", "paragraph"],
        icon: <Text size={18} />,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
        },
    },
    {
        title: "To-do List",
        description: "Track tasks with a to-do list.",
        searchTerms: ["todo", "task", "list", "check", "checkbox"],
        icon: <CheckSquare size={18} />,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: "Heading 1",
        description: "Big section heading.",
        searchTerms: ["title", "big", "large", "h1"],
        icon: <Heading1 size={18} />,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
        },
    },
    {
        title: "Heading 2",
        description: "Medium section heading.",
        searchTerms: ["subtitle", "medium", "h2"],
        icon: <Heading2 size={18} />,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
        },
    },
    {
        title: "Heading 3",
        description: "Small section heading.",
        searchTerms: ["subtitle", "small", "h3"],
        icon: <Heading3 size={18} />,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
        },
    },
    {
        title: "Bullet List",
        description: "Create a simple bullet list.",
        searchTerms: ["unordered", "point", "ul"],
        icon: <List size={18} />,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: "Numbered List",
        description: "Create a list with numbering.",
        searchTerms: ["ordered", "ol"],
        icon: <ListOrdered size={18} />,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: "Quote",
        description: "Capture a quote.",
        searchTerms: ["blockquote"],
        icon: <TextQuote size={18} />,
        command: ({ editor, range }: CommandProps) =>
            editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").toggleBlockquote().run(),
    },
    {
        title: "Code",
        description: "Capture a code snippet.",
        searchTerms: ["codeblock"],
        icon: <Code size={18} />,
        command: ({ editor, range }: CommandProps) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
        title: "Gallery Image",
        description: "Select an image from the gallery.",
        searchTerms: ["gallery", "photo", "picture"],
        icon: <ImageIcon size={18} />,
        // Command will be handled by CustomEditorCommandItem component
        // This is a special case that opens a dialog instead of executing immediately
    },
    {
        title: "Youtube",
        description: "Embed a Youtube video.",
        searchTerms: ["video", "youtube", "embed"],
        icon: <Youtube size={18} />,
        command: ({ editor, range }: CommandProps) => {
            const videoLink = prompt("Please enter Youtube Video Link");

            // YouTube URL validation regex
            // Matches: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
            const ytregex = new RegExp(
                /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
            );

            if (videoLink && ytregex.test(videoLink)) {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setYoutubeVideo({
                        src: videoLink,
                    })
                    .run();
            } else {
                if (videoLink !== null) {
                    toast({
                        title: "Invalid YouTube URL",
                        description: "Please enter a valid YouTube video link.",
                        variant: "destructive",
                        duration: 5000,
                    });
                }
            }
        },
    },
    {
        title: "Twitter",
        description: "Embed a Tweet.",
        searchTerms: ["twitter", "x", "tweet", "embed"],
        icon: <Twitter size={18} />,
        command: ({ editor, range }: CommandProps) => {
            const tweetLink = prompt("Please enter Twitter Link");

            // Twitter/X URL validation regex
            // Matches: x.com/username/status/id or twitter.com/username/status/id
            const tweetRegex = new RegExp(/^https?:\/\/(www\.)?(x|twitter)\.com\/([a-zA-Z0-9_]{1,15})(\/status\/(\d+))?(\/\S*)?$/);

            if (tweetLink && tweetRegex.test(tweetLink)) {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setTweet({
                        src: tweetLink,
                    })
                    .run();
            } else {
                if (tweetLink !== null) {
                    toast({
                        title: "Invalid Twitter URL",
                        description: "Please enter a valid Twitter/X post link.",
                        variant: "destructive",
                        duration: 5000,
                    });
                }
            }
        },
    },
]);

/**
 * Slash command configuration for the Novel editor
 * This enables the "/" command menu with all suggestion items
 */
export const slashCommand = Command.configure({
    suggestion: {
        items: () => suggestionItems,
        render: renderItems,
    },
});
