"use client";

import { useQueryClient } from "@tanstack/react-query";
import { deleteFacts, deleteMultipleFacts } from "@/lib/api/factsApi";
import { toast } from "@/components/ui/use-toast";
import AddFact from "./AddFacts";
import SingleFact from "./SingleFacts";
import FactTableRow from "./FactTableRow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacts } from "./useFacts";
import { ViewToggle } from "../ViewToggle";
import { getViewPreference, setViewPreference } from "@/lib/utils/viewPreferences";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/hooks/useAuth";

const TourFacts = () => {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddFactOpen, setIsAddFactOpen] = useState(false);
    const [view, setView] = useState<'grid' | 'list'>(() => getViewPreference('facts'));
    const [selectedFacts, setSelectedFacts] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    const handleViewChange = (newView: 'grid' | 'list') => {
        setView(newView);
        setViewPreference('facts', newView);
    };

    const { data: facts, isLoading, isError } = useFacts(userId);

    const handleDeleteFacts = async (factId: string) => {
        try {
            await deleteFacts(factId);
            toast({
                title: 'Fact deleted successfully',
                description: 'The fact has been removed.',
                variant: 'default',
            });
            queryClient.invalidateQueries({
                queryKey: ['Facts', userId],
            });
        } catch (error) {
            toast({
                title: 'Failed to delete fact',
                description: 'An error occurred while deleting the fact.',
                variant: 'destructive',
            });
        }
    };

    const handleSelectFact = (factId: string, checked: boolean) => {
        setSelectedFacts(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(factId);
            } else {
                newSet.delete(factId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true && filteredFacts) {
            setSelectedFacts(new Set(filteredFacts.map((fact: any) => fact.id || fact._id)));
        } else {
            setSelectedFacts(new Set());
        }
    };

    const handleBulkDelete = async () => {
        try {
            const idsToDelete = Array.from(selectedFacts);
            await deleteMultipleFacts(idsToDelete);
            toast({
                title: 'Facts deleted successfully',
                description: `${idsToDelete.length} fact(s) have been removed.`,
            });
            setSelectedFacts(new Set());
            setBulkDeleteDialogOpen(false);
            queryClient.invalidateQueries({
                queryKey: ['Facts', userId],
            });
        } catch (error) {
            toast({
                title: 'Failed to delete facts',
                description: 'An error occurred while deleting the facts.',
                variant: 'destructive',
            });
        }
    };

    const filteredFacts = facts?.filter(fact =>
        fact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fact.field_type?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (Array.isArray(fact.value) && fact.value.some((val: string) =>
            val.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex flex-col space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">Tour Facts</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {/* Search Bar */}
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search facts..."
                                className="pl-9 w-full sm:w-[300px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <ViewToggle view={view} onViewChange={handleViewChange} />
                        {selectedFacts.size > 0 && view === 'list' && (
                            <Button
                                variant="destructive"
                                onClick={() => setBulkDeleteDialogOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete ({selectedFacts.size})
                            </Button>
                        )}
                        <Button
                            onClick={() => setIsAddFactOpen(!isAddFactOpen)}
                            className="flex items-center gap-2"
                        >
                            {isAddFactOpen ? "Close Form" : "Add New Fact"}
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Add Fact Form */}
                {isAddFactOpen && (
                    <div className="w-full">
                        <AddFact
                            onFactAdded={() => {
                                if (userId) {
                                    queryClient.invalidateQueries({
                                        queryKey: ['Facts', userId]
                                    });
                                    setIsAddFactOpen(false);
                                }
                            }}
                        />
                    </div>
                )}

                {/* Facts List */}
                <Card className="shadow-xs border-border py-0">
                    <CardHeader className="bg-secondary/50 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl pt-4">Tour Facts</CardTitle>
                        </div>
                        <CardDescription>
                            Manage important facts about your tours
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoading ? (
                            view === 'grid' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <Card key={i} className="shadow-xs">
                                            <CardHeader className="space-y-2 pb-4">
                                                <Skeleton className="h-4 w-full max-w-[250px]" />
                                                <Skeleton className="h-3 w-full max-w-[200px]" />
                                            </CardHeader>
                                            <CardContent className="pb-6">
                                                <Skeleton className="h-20 w-full" />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            )
                        ) : isError ? (
                            <div className="bg-destructive/10 text-destructive rounded-md p-4">
                                <p className="font-medium">Failed to load facts</p>
                                <p className="text-sm">Please try refreshing the page or check your connection.</p>
                            </div>
                        ) : filteredFacts?.length ? (
                            view === 'grid' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredFacts.map((fact, index) => (
                                        <SingleFact
                                            key={fact._id || `fact-${index}`}
                                            fact={fact}
                                            DeleteFact={handleDeleteFacts}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="p-4 w-12">
                                                    <Checkbox
                                                        checked={filteredFacts.length > 0 && selectedFacts.size === filteredFacts.length}
                                                        onCheckedChange={handleSelectAll}
                                                    />
                                                </th>
                                                <th className="p-4 text-left font-medium">Name</th>
                                                <th className="p-4 text-left font-medium">Type</th>
                                                <th className="p-4 text-left font-medium">Values</th>
                                                <th className="p-4 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredFacts.map((fact, index) => {
                                                const factId = fact.id || fact._id || '';
                                                return (
                                                    <FactTableRow
                                                        key={factId || `fact-${index}`}
                                                        fact={fact}
                                                        DeleteFact={handleDeleteFacts}
                                                        isSelected={!!factId && selectedFacts.has(factId)}
                                                        onSelectChange={handleSelectFact}
                                                    />
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : facts?.length ? (
                            <div className="text-center py-8">
                                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-medium text-lg mb-1">No matching facts found</h3>
                                <p className="text-muted-foreground">Try adjusting your search query</p>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                                <h3 className="font-medium text-lg mb-2">No facts added yet</h3>
                                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                    Facts provide important information about your tours.
                                    They'll appear here once added.
                                </p>
                                <Button
                                    onClick={() => setIsAddFactOpen(true)}
                                    variant="outline"
                                    className="mx-auto"
                                >
                                    Create your first fact
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Bulk Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedFacts.size} fact(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete {selectedFacts.size} Fact(s)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TourFacts;
