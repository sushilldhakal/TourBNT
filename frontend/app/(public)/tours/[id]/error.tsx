'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Tour detail page error:', error);
    }, [error]);

    return (
        <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
                <div className="bg-destructive/10 border border-destructive/20 p-8 rounded-lg">
                    <div className="flex justify-center mb-4">
                        <div className="bg-destructive/20 p-4 rounded-full">
                            <AlertTriangle className="h-12 w-12 text-destructive" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-destructive mb-3">
                        Something Went Wrong
                    </h1>

                    <p className="text-muted-foreground mb-2 text-lg">
                        We encountered an error while loading this tour.
                    </p>

                    <p className="text-sm text-muted-foreground mb-6">
                        {error.message || 'An unexpected error occurred. Please try again.'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            onClick={reset}
                            variant="default"
                            className="w-full sm:w-auto"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>

                        <Link href="/">
                            <Button variant="outline" className="w-full sm:w-auto">
                                <Home className="mr-2 h-4 w-4" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>

                    {error.digest && (
                        <p className="mt-4 text-xs text-muted-foreground">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>

                <div className="mt-8 text-sm text-muted-foreground">
                    <p>
                        If this problem persists, please contact our support team with the error details above.
                    </p>
                </div>
            </div>
        </div>
    );
}
