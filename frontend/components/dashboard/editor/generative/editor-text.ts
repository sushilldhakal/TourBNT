import type { Editor } from "@tiptap/core";

/**
 * Selected text for AI edits. Uses the markdown serializer when that extension is registered,
 * otherwise falls back to plain text (editor.storage.markdown is undefined without it).
 */
export function getSelectionText(editor: Editor): string {
    const { selection, doc } = editor.state;
    const markdown = editor.storage.markdown?.serializer;
    if (markdown) {
        try {
            return markdown.serialize(selection.content().content);
        } catch {
            // fall through to plain text
        }
    }
    return doc.textBetween(selection.from, selection.to, "\n\n");
}

/**
 * Text before the cursor, used as context for "continue writing". Not novel's getPrevText: that
 * reads editor.storage.markdown.serializer, which throws when the markdown extension isn't registered.
 */
export function getContextBeforeCursor(editor: Editor, chars = 2000): string {
    const { doc, selection } = editor.state;
    const from = Math.max(0, selection.from - chars);
    return doc.textBetween(from, selection.from, "\n\n");
}
