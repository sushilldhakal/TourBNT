import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Category } from '@/lib/types';

interface TourHeaderProps {
    title: string;
    code: string;
    categories?: string | Category[];
}

export function TourHeader({ title, code, categories }: TourHeaderProps) {
    // Normalize categories to array
    const categoryArray = React.useMemo(() => {
        if (!categories) return [];
        if (typeof categories === 'string') return [];
        if (Array.isArray(categories)) return categories;
        return [];
    }, [categories]);

    return (
        <header className="space-y-3 sm:space-y-4">
            {/* Tour Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground break-words">
                {title}
            </h1>

            {/* Tour Code and Categories */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Tour Code */}
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Tour Code:</span>
                    <code className="px-2 py-1 bg-muted rounded text-xs sm:text-sm font-mono font-semibold" aria-label={`Tour code ${code}`}>
                        {code}
                    </code>
                </div>

                {/* Category Badges */}
                {categoryArray.length > 0 && (
                    <>
                        <span className="text-muted-foreground hidden sm:inline" aria-hidden="true">•</span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2" role="list" aria-label="Tour categories">
                            {categoryArray.map((category) => (
                                <Badge
                                    key={category._id}
                                    variant="secondary"
                                    className="text-xs"
                                    role="listitem"
                                >
                                    {category.name}
                                </Badge>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}
