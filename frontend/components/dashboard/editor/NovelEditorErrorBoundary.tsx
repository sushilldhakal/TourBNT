"use client";

import React, { Component, ReactNode } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NovelEditorErrorBoundaryProps {
    children: ReactNode;
    fallbackValue?: string;
    onFallbackChange?: (value: string) => void;
}

interface NovelEditorErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary for NovelEditor
 * 
 * Catches errors in the Novel editor and provides a fallback textarea
 * to prevent data loss and allow users to continue editing.
 * 
 * Features:
 * - Catches and logs editor initialization errors
 * - Provides fallback textarea when editor fails
 * - Allows retry to reinitialize the editor
 * - Preserves content during fallback
 * 
 * Requirements: 20.3
 */
class NovelEditorErrorBoundary extends Component<
    NovelEditorErrorBoundaryProps,
    NovelEditorErrorBoundaryState
> {
    constructor(props: NovelEditorErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<NovelEditorErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error details for debugging
        console.error('NovelEditor Error:', error);
        console.error('Error Info:', errorInfo);

        // You can also log to an error reporting service here
        this.setState({
            error,
            errorInfo,
        });
    }

    handleRetry = () => {
        // Reset error state to retry rendering the editor
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            const { fallbackValue = '', onFallbackChange } = this.props;

            return (
                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Editor Failed to Load</AlertTitle>
                        <AlertDescription>
                            The rich text editor encountered an error and couldn't load properly.
                            You can continue editing using the basic text area below, or try reloading the editor.
                        </AlertDescription>
                    </Alert>

                    {/* Fallback textarea */}
                    <div className="space-y-2">
                        <Textarea
                            value={fallbackValue}
                            onChange={(e) => onFallbackChange?.(e.target.value)}
                            className="min-h-[300px] font-mono text-sm"
                            placeholder="Enter your content here..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Using fallback text editor. Your content is safe.
                        </p>
                    </div>

                    {/* Retry button */}
                    <Button onClick={this.handleRetry} variant="outline">
                        Try Loading Editor Again
                    </Button>

                    {/* Error details (only in development) */}
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-4 p-4 bg-muted rounded-md text-xs">
                            <summary className="cursor-pointer font-semibold mb-2">
                                Error Details (Development Only)
                            </summary>
                            <pre className="whitespace-pre-wrap overflow-auto">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default NovelEditorErrorBoundary;
