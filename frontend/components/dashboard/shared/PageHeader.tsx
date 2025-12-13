import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface PageHeaderProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        href: string;
        icon?: React.ReactNode;
    };
    badge?: {
        label: string;
        variant?: 'default' | 'secondary' | 'outline';
    };
}

export function PageHeader({ icon, title, description, action, badge }: PageHeaderProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <span className="text-primary">{icon}</span>
                            {title}
                            {badge && (
                                <Badge variant={badge.variant || 'outline'} className="ml-2">
                                    {badge.label}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="text-base">
                            {description}
                        </CardDescription>
                    </div>
                    {action && (
                        <Link href={action.href}>
                            <Button className="gap-2">
                                {action.icon}
                                {action.label}
                            </Button>
                        </Link>
                    )}
                </div>
            </CardHeader>
        </Card>
    );
}
