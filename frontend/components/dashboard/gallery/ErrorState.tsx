/**
 * ErrorState Component
 * 
 * Displays error messages with retry functionality.
 * Supports different error types with appropriate styling and icons.
 */

'use client';

import { ErrorStateProps } from './types';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/Icon';

/**
 * Determines error type and returns appropriate icon and styling
 */
function getErrorType(message: string) {
    const lowerMessage = message.toLowerCase();

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
        return {
            icon: 'lu:LuWifiOff',
            variant: 'destructive' as const,
            title: 'Connection Error',
        };
    }

    // Authentication errors
    if (lowerMessage.includes('auth') || lowerMessage.includes('login') || lowerMessage.includes('401')) {
        return {
            icon: 'lu:LuShieldAlert',
            variant: 'destructive' as const,
            title: 'Authentication Error',
        };
    }

    // Permission errors
    if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
        return {
            icon: 'lu:LuLock',
            variant: 'destructive' as const,
            title: 'Permission Denied',
        };
    }

    // Not found errors
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
        return {
            icon: 'lu:LuSearchX',
            variant: 'destructive' as const,
            title: 'Not Found',
        };
    }

    // Upload/file errors
    if (lowerMessage.includes('upload') || lowerMessage.includes('file')) {
        return {
            icon: 'lu:LuUploadCloud',
            variant: 'destructive' as const,
            title: 'Upload Error',
        };
    }

    // Configuration errors (e.g., missing API key)
    if (lowerMessage.includes('configure') || lowerMessage.includes('api key') || lowerMessage.includes('410')) {
        return {
            icon: 'lu:LuSettings',
            variant: 'destructive' as const,
            title: 'Configuration Required',
        };
    }

    // Generic error
    return {
        icon: 'lu:LuAlertCircle',
        variant: 'destructive' as const,
        title: 'Error',
    };
}

/**
 * ErrorState Component
 * Displays error message with optional retry button
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
    const errorType = getErrorType(message);

    return (
        <div className="flex items-center justify-center min-h-[400px] p-6" role="alert" aria-live="assertive">
            <div className="w-full max-w-md">
                <Alert variant={errorType.variant} className="mb-4">
                    <Icon name={errorType.icon} aria-hidden="true" />
                    <AlertTitle id="error-title">{errorType.title}</AlertTitle>
                    <AlertDescription id="error-description">
                        <p className="mb-3">{message}</p>
                        {onRetry && (
                            <Button
                                onClick={onRetry}
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                aria-label="Retry loading media"
                                aria-describedby="error-description"
                            >
                                <Icon name="lu:LuRefreshCw" size={16} aria-hidden="true" />
                                Try Again
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>

                {/* Additional help text for common errors */}
                {errorType.title === 'Configuration Required' && (
                    <div className="text-sm text-muted-foreground mt-4 space-y-2">
                        <p className="font-medium">Need help?</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Check your Cloudinary API configuration</li>
                            <li>Verify your API keys are set correctly</li>
                            <li>Contact your administrator if the issue persists</li>
                        </ul>
                    </div>
                )}

                {errorType.title === 'Connection Error' && (
                    <div className="text-sm text-muted-foreground mt-4 space-y-2">
                        <p className="font-medium">Troubleshooting tips:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Check your internet connection</li>
                            <li>Try refreshing the page</li>
                            <li>Contact support if the problem continues</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
