import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function TourDetailSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Banner Skeleton */}
            <div className="relative h-[300px] bg-muted" />

            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb Skeleton */}
                <div className="mb-6">
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - 2/3 width */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Skeleton */}
                        <div className="space-y-3">
                            <Skeleton className="h-8 w-3/4" />
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        </div>

                        {/* Facts Grid Skeleton */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-2 flex-1">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-3 w-32" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Gallery Skeleton */}
                        <Card>
                            <CardContent className="p-6">
                                <Skeleton className="h-6 w-24 mb-4" />
                                <Skeleton className="h-[400px] w-full rounded-lg mb-4" />
                                <div className="grid grid-cols-5 gap-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded" />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tabs Skeleton */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex gap-4 mb-6">
                                    {[...Array(4)].map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-32" />
                                    ))}
                                </div>
                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-32 w-full mt-4" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Reviews Skeleton */}
                        <Card>
                            <CardContent className="p-6">
                                <Skeleton className="h-6 w-32 mb-4" />
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex gap-4">
                                            <Skeleton className="h-12 w-12 rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-full" />
                                                <Skeleton className="h-3 w-2/3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - 1/3 width */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardContent className="p-0">
                                <div className="bg-muted p-4">
                                    <Skeleton className="h-6 w-48 mx-auto" />
                                </div>
                                <div className="p-6 space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
