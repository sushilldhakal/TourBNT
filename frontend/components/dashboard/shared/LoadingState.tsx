import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingStateProps {
    type: 'table' | 'cards' | 'form' | 'gallery';
    rows?: number;
    columns?: number;
}

export function LoadingState({ type, rows = 5, columns = 4 }: LoadingStateProps) {
    if (type === 'table') {
        return (
            <div className="space-y-4">
                {/* Table header */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton key={i} className="h-8" />
                    ))}
                </div>
                {/* Table rows */}
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <Skeleton key={colIndex} className="h-12" />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'cards') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: rows || 6 }).map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                        <CardHeader className="p-6">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (type === 'form') {
        return (
            <div className="space-y-6">
                {Array.from({ length: rows || 4 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'gallery') {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: rows || 15 }).map((_, index) => (
                    <div key={index} className="flex flex-col space-y-2">
                        <Skeleton className="h-[125px] w-full rounded-md" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    return null;
}
