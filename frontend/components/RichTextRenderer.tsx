import React from 'react';

interface RichTextRendererProps {
    /** A rich-text document (or its JSON string), HTML, or plain text. */
    content: unknown;
    className?: string;
}

interface MarkAttributes {
    color?: string;
    href?: string;
    target?: string;
    rel?: string;
    class?: string;
}

interface Mark {
    type: string;
    attrs?: MarkAttributes;
}

interface NodeAttributes {
    level?: number;
    src?: string;
    alt?: string;
    title?: string;
    width?: number | null;
    height?: number | null;
    tight?: boolean;
    start?: number;
    checked?: boolean;
    latex?: string;
    language?: string | null;
}

interface ContentNode {
    type: string;
    text?: string;
    marks?: Mark[];
    attrs?: NodeAttributes;
    content?: ContentNode[];
}

interface JsonContent {
    type?: string;
    content?: ContentNode[];
}

// Everything below ends up in dangerouslySetInnerHTML, and the content is written by sellers and other users,
// so every piece of text and every attribute is escaped and every URL/colour is checked before it is used.
const escapeHtml = (s: unknown) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Only web, mail and phone links, or links within the site; anything else (javascript:, data:, ...) is dropped. */
const safeUrl = (url: unknown): string | null => {
    const u = String(url ?? '').trim();
    if (!u) return null;
    if (/^(https?:|mailto:|tel:)/i.test(u) || /^[/#?]/.test(u)) return u;
    return null;
};

/** Images: web addresses or site paths only. */
const safeImageSrc = (src: unknown): string | null => {
    const u = String(src ?? '').trim();
    return /^https?:\/\//i.test(u) || u.startsWith('/') ? u : null;
};

const safeColor = (c: unknown): string | null => {
    const v = String(c ?? '').trim();
    return /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\([\d\s.,%]+\)$/i.test(v) || /^[a-z]{3,20}$/i.test(v) ? v : null;
};

const LINK_CLASSES = 'text-primary underline underline-offset-2 hover:text-primary/80 transition-colors';

const parseRichText = (content: unknown): { __html: string } => {
    if (!content) return { __html: "No content available" };

    if (Array.isArray(content)) {
        if (content.length > 0) {
            return parseRichText(content[0]);
        } else {
            return { __html: "No content available" };
        }
    }

    const contentStr = typeof content === 'string' ? content : typeof content === 'object' ? JSON.stringify(content) : String(content);
    const isLikelyJSON = contentStr.trim().startsWith('{') && contentStr.trim().endsWith('}');

    if (isLikelyJSON) {
        try {
            const jsonData = JSON.parse(contentStr) as JsonContent;

            const processContent = (content: ContentNode[]): string => {
                if (!Array.isArray(content)) return '';

                return content.map(item => {
                    if (item.type === 'paragraph') {
                        const paragraphContent = processContent(item.content || []);
                        return paragraphContent ? `<p>${paragraphContent}</p>` : '<p></p>';
                    } else if (item.type === 'text') {
                        let text = escapeHtml(item.text || '');

                        if (item.marks && Array.isArray(item.marks)) {
                            item.marks.forEach((mark: Mark) => {
                                if (mark.type === 'bold') {
                                    text = `<strong>${text}</strong>`;
                                } else if (mark.type === 'italic') {
                                    text = `<em>${text}</em>`;
                                } else if (mark.type === 'underline') {
                                    text = `<u>${text}</u>`;
                                } else if (mark.type === 'textColor' || (mark.type === 'textStyle' && mark.attrs?.color)) {
                                    const color = safeColor(mark.attrs?.color);
                                    if (color) text = `<span style="color:${color}">${text}</span>`;
                                } else if (mark.type === 'backgroundColor') {
                                    const color = safeColor(mark.attrs?.color);
                                    if (color) text = `<span style="background-color:${color}">${text}</span>`;
                                } else if (mark.type === 'code') {
                                    text = `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">${text}</code>`;
                                } else if (mark.type === 'link') {
                                    const href = safeUrl(mark.attrs?.href);
                                    if (href) {
                                        const target = mark.attrs?.target === '_self' ? '_self' : '_blank';
                                        text = `<a href="${escapeHtml(href)}" target="${target}" rel="noopener noreferrer nofollow" class="${LINK_CLASSES}">${text}</a>`;
                                    }
                                }
                            });
                        }

                        return text;
                    } else if (item.type === 'hardBreak') {
                        return '<br>';
                    } else if (item.type === 'heading') {
                        const level = Math.min(6, Math.max(1, Math.trunc(Number(item.attrs?.level) || 1)));
                        const headingContent = processContent(item.content || []);
                        return headingContent ?
                            `<h${level} class="font-bold mt-6 mb-3">${headingContent}</h${level}>` :
                            `<h${level} class="font-bold mt-6 mb-3"></h${level}>`;
                    } else if (item.type === 'image') {
                        const src = safeImageSrc(item.attrs?.src);
                        if (!src) return '';
                        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.attrs?.alt || '')}" title="${escapeHtml(item.attrs?.title || '')}" loading="lazy" class="my-4 rounded-md max-w-full h-auto" />`;
                    } else if (item.type === 'bulletList') {
                        return `<ul class="list-disc pl-5 my-3 space-y-1">${processContent(item.content || [])}</ul>`;
                    } else if (item.type === 'orderedList') {
                        const isTight = item.attrs?.tight === true;
                        const start = Math.trunc(Number(item.attrs?.start) || 1);
                        return `<ol class="list-decimal pl-5 my-3 ${isTight ? 'space-y-1' : 'space-y-2'}" start="${start}">${processContent(item.content || [])}</ol>`;
                    } else if (item.type === 'listItem') {
                        return `<li>${processContent(item.content || [])}</li>`;
                    } else if (item.type === 'taskList') {
                        return `<ul class="my-3 space-y-1">${processContent(item.content || [])}</ul>`;
                    } else if (item.type === 'taskItem') {
                        const checked = item.attrs?.checked === true;
                        return `<li class="flex items-start gap-2">
                <input type="checkbox" ${checked ? 'checked' : ''} disabled class="mt-1" />
                <div>${processContent(item.content || [])}</div>
            </li>`;
                    } else if (item.type === 'blockquote') {
                        return `<blockquote class="border-l-4 border-primary pl-4 italic my-4">${processContent(item.content || [])}</blockquote>`;
                    } else if (item.type === 'codeBlock') {
                        const language = /^[\w+-]{1,30}$/.test(item.attrs?.language || '') ? item.attrs!.language : '';
                        const codeContent = processContent(item.content || []);
                        return `<pre class="bg-muted p-4 rounded-md overflow-x-auto my-4"><code class="language-${language}">${codeContent}</code></pre>`;
                    } else if (item.type === 'horizontalRule') {
                        return `<hr class="my-6 border-t border-border" />`;
                    } else if (item.type === 'twitter' && safeUrl(item.attrs?.src)) {
                        const src = escapeHtml(safeUrl(item.attrs?.src));
                        return `<div class="my-4 p-4 border rounded-md bg-accent/10">
                <p class="font-medium mb-2">Twitter Post</p>
                <a href="${src}" target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline">
                    ${src}
                </a>
            </div>`;
                    } else if (item.type === 'math' && item.attrs?.latex) {
                        return `<div class="my-2">
                <code class="bg-muted px-2 py-1 rounded font-mono">${escapeHtml(item.attrs.latex)}</code>
            </div>`;
                    } else if (item.type === 'doc') {
                        return processContent(item.content || []);
                    } else if (item.content) {
                        return processContent(item.content);
                    }

                    return '';
                }).join('');
            };

            if (jsonData.type === 'doc') {
                const htmlContent = processContent(jsonData.content || []);
                return { __html: htmlContent };
            } else if (jsonData.content) {
                const htmlContent = processContent(jsonData.content || []);
                return { __html: htmlContent };
            }

            return { __html: "Invalid document structure" };
        } catch (e) {
            console.error("Error parsing JSON content:", e);
        }
    }

    try {
        const formattedText = contentStr
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
            .join('');

        return { __html: formattedText || escapeHtml(contentStr) };
    } catch (e) {
        console.error("Error formatting text content:", e);
        return { __html: escapeHtml(content) || "No content available" };
    }
};

const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
    return (
        <div
            className={`rich-text-content prose dark:prose-invert max-w-none ${className}`}
            dangerouslySetInnerHTML={parseRichText(content)}
        />
    );
};

export default RichTextRenderer;
