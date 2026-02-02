'use client';

import dynamic from 'next/dynamic';
import { useLayout } from '@/providers/LayoutProvider';
import { cn } from '@/lib/utils';
import { Footer } from './Footer';

const Navigation = dynamic(() => import('./Navigation').then((m) => m.Navigation), {
    ssr: false,
    loading: () => (
        <div className="relative min-h-[120px] w-full bg-background" aria-hidden="true" />
    ),
});

/**
 * Wraps content inside a full-width row. Row is always full width; this container
 * constrains the content: max-w-7xl when boxed (isFullWidth false), w-full when full width.
 * Exported so header, footer, and page sections can use it without duplicating layout logic.
 */
export function ContentContainer({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const { isFullWidth } = useLayout();

    return (
        <div
            className={cn(
                'transition-all duration-300',
                isFullWidth ? 'w-full' : 'max-w-7xl mx-auto',
                className
            )}
        >
            {children}
        </div>
    );
}

/**
 * Public layout: every row (header, hero, content, footer) is always full width.
 * Content *inside* each row uses ContentContainer above (max-w-7xl when boxed, w-full when full width).
 */
export function PublicLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full">
            <Navigation />
            <main>{children}</main>
            <Footer />
        </div>
    );
}
