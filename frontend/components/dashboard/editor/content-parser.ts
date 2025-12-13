/**
 * Content Parser Utilities for Novel Editor
 * Provides safe JSON parsing with error handling and validation
 * Requirements: 20.2
 */

import type { JSONContent } from 'novel';

/**
 * Result type for safe parsing operations
 */
export interface ParseResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Validate that a parsed object has the expected JSONContent structure
 * @param obj - Object to validate
 * @returns True if valid JSONContent structure
 */
export function isValidJSONContent(obj: any): obj is JSONContent {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    // Must have a type property
    if (typeof obj.type !== 'string') {
        return false;
    }

    // If it has content, it must be an array
    if (obj.content !== undefined && !Array.isArray(obj.content)) {
        return false;
    }

    // If it has marks, it must be an array
    if (obj.marks !== undefined && !Array.isArray(obj.marks)) {
        return false;
    }

    // If it has text, it must be a string
    if (obj.text !== undefined && typeof obj.text !== 'string') {
        return false;
    }

    return true;
}

/**
 * Safely parse JSON string to JSONContent
 * Includes validation and error handling
 * 
 * @param jsonString - JSON string to parse
 * @param fieldName - Name of the field being parsed (for error messages)
 * @returns ParseResult with success status and data or error
 */
export function safeParseJSONContent(
    jsonString: string | null | undefined,
    fieldName: string = 'content'
): ParseResult<JSONContent> {
    // Handle null/undefined
    if (!jsonString) {
        return {
            success: true,
            data: undefined,
        };
    }

    // If already an object, validate and return
    if (typeof jsonString !== 'string') {
        if (isValidJSONContent(jsonString)) {
            return {
                success: true,
                data: jsonString as JSONContent,
            };
        } else {
            return {
                success: false,
                error: `Invalid ${fieldName} structure: not a valid JSONContent object`,
            };
        }
    }

    // Try to parse JSON string
    try {
        const parsed = JSON.parse(jsonString);

        // Validate structure
        if (!isValidJSONContent(parsed)) {
            console.error(`Invalid ${fieldName} structure:`, parsed);
            return {
                success: false,
                error: `Invalid ${fieldName} structure: missing required fields or invalid types`,
            };
        }

        return {
            success: true,
            data: parsed,
        };
    } catch (error) {
        console.error(`Error parsing ${fieldName}:`, error);
        console.error('Invalid JSON string:', jsonString);

        return {
            success: false,
            error: `Failed to parse ${fieldName}: ${error instanceof Error ? error.message : 'Invalid JSON format'}`,
        };
    }
}

/**
 * Safely stringify JSONContent to JSON string
 * Includes error handling
 * 
 * @param content - JSONContent to stringify
 * @param fieldName - Name of the field being stringified (for error messages)
 * @returns ParseResult with success status and data or error
 */
export function safeStringifyJSONContent(
    content: JSONContent | null | undefined,
    fieldName: string = 'content'
): ParseResult<string> {
    // Handle null/undefined
    if (!content) {
        return {
            success: true,
            data: '',
        };
    }

    // Validate structure before stringifying
    if (!isValidJSONContent(content)) {
        return {
            success: false,
            error: `Invalid ${fieldName} structure: cannot stringify`,
        };
    }

    try {
        const jsonString = JSON.stringify(content);
        return {
            success: true,
            data: jsonString,
        };
    } catch (error) {
        console.error(`Error stringifying ${fieldName}:`, error);
        return {
            success: false,
            error: `Failed to stringify ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Create an empty JSONContent document
 * Useful as a fallback when parsing fails
 * 
 * @returns Empty JSONContent document
 */
export function createEmptyDocument(): JSONContent {
    return {
        type: 'doc',
        content: [],
    };
}

/**
 * Sanitize potentially malicious content
 * Removes script tags and dangerous attributes
 * 
 * @param content - JSONContent to sanitize
 * @returns Sanitized JSONContent
 */
export function sanitizeJSONContent(content: JSONContent): JSONContent {
    // Create a deep copy to avoid mutating the original
    const sanitized = JSON.parse(JSON.stringify(content));

    // Recursive function to sanitize nodes
    function sanitizeNode(node: any): any {
        // Remove dangerous node types
        if (node.type === 'script' || node.type === 'iframe') {
            return null;
        }

        // Sanitize attributes
        if (node.attrs) {
            // Remove event handlers
            Object.keys(node.attrs).forEach(key => {
                if (key.startsWith('on')) {
                    delete node.attrs[key];
                }
            });

            // Sanitize href and src attributes
            if (node.attrs.href && typeof node.attrs.href === 'string') {
                if (node.attrs.href.startsWith('javascript:')) {
                    delete node.attrs.href;
                }
            }
            if (node.attrs.src && typeof node.attrs.src === 'string') {
                if (node.attrs.src.startsWith('javascript:')) {
                    delete node.attrs.src;
                }
            }
        }

        // Recursively sanitize content
        if (node.content && Array.isArray(node.content)) {
            node.content = node.content
                .map(sanitizeNode)
                .filter((n: any) => n !== null);
        }

        return node;
    }

    return sanitizeNode(sanitized);
}
