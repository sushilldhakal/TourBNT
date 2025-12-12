import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function ToursBreadcrumb() {
    return (
        <div className="border-b border-border bg-background">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <nav className="flex items-center space-x-2 text-sm">
                    <Link
                        href="/"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Home
                    </Link>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">Tours</span>
                </nav>
            </div>
        </div>
    );
}
