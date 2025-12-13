import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        href: string;
        icon?: React.ReactNode;
    };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="mx-auto w-fit rounded-full bg-muted/50 p-4 mb-6 text-muted-foreground">
                    {icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
                <p className="text-sm text-muted-foreground text-center mb-8 max-w-md mx-auto">
                    {description}
                </p>
                {action && (
                    <Link href={action.href}>
                        <Button size="lg" className="gap-2">
                            {action.icon}
                            {action.label}
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
