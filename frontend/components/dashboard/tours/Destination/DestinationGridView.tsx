import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DestinationTypes } from "@/lib/types";
import SingleDestination from "./SingleDestination";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/useAuth";

interface DestinationGridViewProps {
    destinations: DestinationTypes[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

const DestinationGridView = ({ destinations, isLoading, onRefresh }: DestinationGridViewProps) => {
    const queryClient = useQueryClient();
    const { userRole } = useAuth();
    const isAdminView = userRole === 'admin';

    const handleUpdate = () => {
        if (isAdminView) {
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
        } else {
            queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
        }
        onRefresh?.();
    };

    const handleDelete = () => {
        // Invalidate all destination-related queries to ensure UI updates
        queryClient.invalidateQueries({ queryKey: ['destinations'] });
        queryClient.invalidateQueries({ queryKey: ['seller-destinations'] });
        queryClient.invalidateQueries({ queryKey: ['pending-destinations'] });
        onRefresh?.();
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="overflow-hidden py-0">
                        <Skeleton className="h-48 w-full" />
                        <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!destinations || destinations.length === 0) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                    <div className="space-y-1">
                        <p className="text-lg font-medium">No destinations found</p>
                        <p className="text-sm text-muted-foreground">
                            Get started by adding your first destination.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {destinations.map((destination) => (
                <SingleDestination
                    key={destination._id}
                    destinationId={destination._id}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
};

export default DestinationGridView;

