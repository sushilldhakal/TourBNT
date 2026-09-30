'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
    page: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    limitOptions?: number[];
    isFetching?: boolean;
}

/** Numbered pages with ellipsis: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, total: number): Array<number | 'gap-l' | 'gap-r'> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: Array<number | 'gap-l' | 'gap-r'> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(total - 1, page + 1);
    if (start > 2) pages.push('gap-l');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push('gap-r');
    pages.push(total);
    return pages;
}

export function PaginationControls({
    page,
    totalPages,
    totalItems,
    limit,
    onPageChange,
    onLimitChange,
    limitOptions = [10, 20, 50],
    isFetching,
}: PaginationControlsProps) {
    if (totalItems === 0) return null;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, totalItems);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                    Showing <span className="font-medium text-foreground">{from}–{to}</span> of{' '}
                    <span className="font-medium text-foreground">{totalItems}</span>
                </span>
                {onLimitChange && (
                    <label className="flex items-center gap-1.5">
                        <span className="hidden sm:inline">Per page</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="h-8 rounded-md border bg-background px-2 text-sm"
                        >
                            {limitOptions.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </label>
                )}
                {isFetching && <span className="text-xs">Updating…</span>}
            </div>

            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageWindow(page, totalPages).map((p, i) =>
                    typeof p === 'number' ? (
                        <Button
                            key={p}
                            variant={p === page ? 'default' : 'outline'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(p)}
                            aria-current={p === page ? 'page' : undefined}
                        >
                            {p}
                        </Button>
                    ) : (
                        <span key={`${p}-${i}`} className="px-1 text-muted-foreground">…</span>
                    ),
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
