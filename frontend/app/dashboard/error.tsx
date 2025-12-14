'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Dashboard error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-600">Something went wrong!</h2>
                <p className="text-muted-foreground">{error.message}</p>
                <Button onClick={reset}>Try again</Button>
            </div>
        </div>
    );
}
