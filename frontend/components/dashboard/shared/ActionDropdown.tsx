import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface ActionItem {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    variant?: 'default' | 'destructive';
    href?: string;
}

interface ActionDropdownProps {
    actions: ActionItem[];
}

export function ActionDropdown({ actions }: ActionDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted"
                >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {actions.map((action, index) => {
                    const isDestructive = action.variant === 'destructive';
                    const className = `flex items-center gap-2 cursor-pointer ${isDestructive ? 'text-destructive focus:text-destructive' : ''
                        }`;

                    // If action has href, render as Link
                    if (action.href) {
                        return (
                            <DropdownMenuItem key={index} asChild>
                                <Link href={action.href} className={className}>
                                    {action.icon}
                                    {action.label}
                                </Link>
                            </DropdownMenuItem>
                        );
                    }

                    // Otherwise render with onClick
                    return (
                        <DropdownMenuItem
                            key={index}
                            onClick={action.onClick}
                            className={className}
                        >
                            {action.icon}
                            {action.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
