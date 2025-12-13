/**
 * Lazy-loaded extensions for Novel editor
 * These extensions are loaded conditionally to reduce initial bundle size
 * Requirements: 19.4
 */

import { Extension, Mark, Node } from '@tiptap/core';

type AnyExtension = Extension | Mark | Node;

/**
 * Lazy load AI extensions
 * Only loaded when AI features are enabled
 */
export const loadAIExtensions = async (): Promise<AnyExtension[]> => {
    const { AIHighlight } = await import('novel');
    return [AIHighlight];
};

/**
 * Lazy load Math extensions
 * Only loaded when math features are needed
 */
export const loadMathExtensions = async (): Promise<AnyExtension[]> => {
    const { Mathematics } = await import('novel');

    return [
        Mathematics.configure({
            HTMLAttributes: {
                class: 'text-foreground rounded p-1 hover:bg-accent cursor-pointer',
            },
            katexOptions: {
                throwOnError: false, // Don't throw errors for invalid LaTeX
            },
        }),
    ];
};

/**
 * Lazy load embedded media extensions
 * Only loaded when media features are needed
 */
export const loadMediaExtensions = async (): Promise<AnyExtension[]> => {
    const { Youtube, Twitter } = await import('novel');

    return [
        Youtube.configure({
            HTMLAttributes: {
                class: 'rounded-lg border border-muted',
            },
            inline: false,
        }),
        Twitter.configure({
            HTMLAttributes: {
                class: 'not-prose',
            },
            inline: false,
        }),
    ];
};

/**
 * Get all lazy extensions based on feature flags
 * @param options - Feature flags for which extensions to load
 * @returns Promise resolving to array of extensions
 */
export const getLazyExtensions = async (options: {
    enableAI?: boolean;
    enableMath?: boolean;
    enableMedia?: boolean;
}): Promise<AnyExtension[]> => {
    const extensions: AnyExtension[] = [];

    // Load extensions based on feature flags
    const promises: Promise<AnyExtension[]>[] = [];

    if (options.enableAI) {
        promises.push(loadAIExtensions());
    }

    if (options.enableMath) {
        promises.push(loadMathExtensions());
    }

    if (options.enableMedia) {
        promises.push(loadMediaExtensions());
    }

    // Wait for all extensions to load
    const results = await Promise.all(promises);

    // Flatten the results
    results.forEach(result => {
        extensions.push(...result);
    });

    return extensions;
};
