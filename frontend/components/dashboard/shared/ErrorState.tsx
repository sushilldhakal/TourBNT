import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
}

export function ErrorState({
    title = "Error Loading Data",
    description = "We encountered an error while fetching data. Please try again.",
    onRetry
}: ErrorStateProps) {
    return (
        <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="mx-auto w-fit rounded-full bg-destructive/10 p-3 mb-4">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm mx-auto">
                    {description}
                </p>
                {onRetry && (
                    <Button
                        variant="outline"
                        onClick={onRetry}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
