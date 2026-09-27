// components/dashboard/DashboardCardHeader.tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface DashboardCardHeaderProps {
    // Icon (optional)
    icon?: LucideIcon;
    iconClassName?: string;

    // Title & Description
    title: string;
    description?: string;
    titleClassName?: string;
    descriptionClassName?: string;

    // Badge (optional)
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';

    // Actions (optional)
    actions?: ReactNode;
    backButton?: {
        label?: string;
        onClick: () => void;
        icon?: LucideIcon;
    };

    // Layout options
    variant?: 'default' | 'compact' | 'split';
    className?: string;
}

export function DashboardCardHeader({
    icon: Icon,
    iconClassName = 'h-5 w-5 text-muted-foreground',
    title,
    description,
    titleClassName = 'text-2xl font-semibold text-foreground',
    descriptionClassName = 'text-sm text-muted-foreground mt-2 max-w-3xl',
    badge,
    badgeVariant = 'outline',
    actions,
    backButton,
    variant = 'default',
    className = 'bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-6 shadow-sm',
}: DashboardCardHeaderProps) {
    // Variant: Split (for Edit pages with back button and actions)
    if (variant === 'split') {
        return (
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 ${className}`}>
                {/* Left side: Back button + Title */}
                <div className="flex items-center gap-4">
                    {backButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={backButton.onClick}
                            aria-label={backButton.label || 'Go back'}
                        >
                            {backButton.icon ? (
                                (() => {
                                    const BackIcon = backButton.icon;
                                    return BackIcon ? <BackIcon className="h-5 w-5" aria-hidden="true" /> : null;
                                })()
                            ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            )}
                        </Button>
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {Icon && <Icon className={iconClassName} aria-hidden="true" />}
                            {badge && (
                                <Badge variant={badgeVariant} className="bg-card text-muted-foreground font-medium">
                                    {badge}
                                </Badge>
                            )}
                        </div>
                        <h1 className={titleClassName}>{title}</h1>
                        {description && (
                            <p className={descriptionClassName}>{description}</p>
                        )}
                    </div>
                </div>

                {/* Right side: Actions */}
                {actions && (
                    <div className="flex gap-2 w-full sm:w-auto">
                        {actions}
                    </div>
                )}
            </div>
        );
    }

    // Variant: Compact (for settings-style pages)
    if (variant === 'compact') {
        return (
            <div className={`mb-6 ${className}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className={iconClassName} aria-hidden="true" />}
                        {badge && (
                            <Badge variant={badgeVariant} className="bg-card text-muted-foreground font-medium">
                                {badge}
                            </Badge>
                        )}
                    </div>
                    {actions}
                </div>
                <h1 className={titleClassName}>{title}</h1>
                {description && (
                    <p className={descriptionClassName}>{description}</p>
                )}
            </div>
        );
    }

    // Variant: Default (standard page header)
    return (
        <div className={`mb-8 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={iconClassName} aria-hidden="true" />}
                    {badge && (
                        <Badge variant={badgeVariant} className="bg-card text-muted-foreground font-medium">
                            {badge}
                        </Badge>
                    )}
                </div>
                {actions}
            </div>
            <h1 className={titleClassName}>{title}</h1>
            {description && (
                <p className={descriptionClassName}>{description}</p>
            )}
        </div>
    );
}