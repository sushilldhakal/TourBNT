import { LayoutGrid, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = 'list' | 'grid';

interface ViewToggleProps {
    view: ViewMode;
    onViewChange: (view: ViewMode) => void;
    className?: string;
}

export const ViewToggle = ({ view, onViewChange, className }: ViewToggleProps) => {
    const handleKeyDown = (e: React.KeyboardEvent, mode: ViewMode) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewChange(mode);
        }
    };

    return (
        <div className={cn("flex items-center gap-1 border rounded-md p-1", className)} role="group" aria-label="View toggle">
            <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('list')}
                onKeyDown={(e) => handleKeyDown(e, 'list')}
                className={cn(
                    "gap-1.5 transition-all",
                    view === 'list' && "shadow-sm"
                )}
                aria-label="List view"
                aria-pressed={view === 'list'}
                tabIndex={0}
            >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
            </Button>
            <Button
                variant={view === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('grid')}
                onKeyDown={(e) => handleKeyDown(e, 'grid')}
                className={cn(
                    "gap-1.5 transition-all",
                    view === 'grid' && "shadow-sm"
                )}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                tabIndex={0}
            >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
            </Button>
        </div>
    );
};
