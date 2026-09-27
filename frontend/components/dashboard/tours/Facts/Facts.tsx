"use client";

import { useCacheManager } from "@/lib/queries/cacheUtils";
import { deleteFacts, deleteMultipleFacts } from "@/lib/api/factsApi";
import { toast } from "@/components/ui/use-toast";
import AddFact from "./AddFacts";
import SingleFact from "./SingleFacts";
import FactTableRow from "./FactTableRow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { DashboardCardHeader } from "@/components/dashboard/layout/CardHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacts } from '@/lib/hooks/tours';
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
import { FactData } from "@/types/facts";

const TourFacts = () => {
    const { userId } = useAuth();
    const { invalidateFacts } = useCacheManager();
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
            invalidateFacts(userId);
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
            invalidateFacts(userId);
        } catch (error) {
            toast({
                title: 'Failed to delete facts',
                description: 'An error occurred while deleting the facts.',
                variant: 'destructive',
            });
        }
    };

    const filteredFacts = facts?.data?.filter((fact: FactData) =>
        fact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fact.field_type?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (Array.isArray(fact.value) && fact.value.some((val: string) =>
            val.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    return (
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 max-w-6xl">
            <div className="flex flex-col space-y-6">
                <DashboardCardHeader
                    variant="compact"
                    icon={FileText}
                    badge="Tours"
                    title="Tour Facts"
                    description="Manage important facts about your tours"
                    actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-initial">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <Input
                                    placeholder="Search facts..."
                                    className="pl-9 w-full sm:w-[300px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label="Search facts"
                                />
                            </div>
                            <ViewToggle view={view} onViewChange={handleViewChange} />
                            {selectedFacts.size > 0 && view === 'list' && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setBulkDeleteDialogOpen(true)}
                                    className="flex items-center gap-2"
                                    aria-label={`Delete ${selectedFacts.size} selected facts`}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Delete ({selectedFacts.size})
                                </Button>
                            )}
                            <Button
                                onClick={() => setIsAddFactOpen(!isAddFactOpen)}
                                className="flex items-center gap-2"
                                aria-label={isAddFactOpen ? "Close add fact form" : "Add new fact"}
                            >
                                {isAddFactOpen ? "Close Form" : "Add New Fact"}
                                <Plus className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>
                    }
                />

                {/* Add Fact Form */}
                {isAddFactOpen && (
                    <div className="w-full">
                        <AddFact
                            onFactAdded={() => {
                                if (userId) {
                                    invalidateFacts(userId);
                                    setIsAddFactOpen(false);
                                }
                            }}
                        />
                    </div>
                )}

                {/* Facts List */}
                <Card className="shadow-sm border">
                    <CardHeader className="bg-secondary/50 border-b px-6 py-6">
                        <CardTitle className="text-xl font-semibold">Tour Facts</CardTitle>
                        <CardDescription className="text-muted-foreground">
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
                            <div className="bg-destructive/10 text-destructive rounded-lg p-6" role="alert" aria-live="polite">
                                <p className="font-semibold text-base mb-2">Failed to load facts</p>
                                <p className="text-sm text-destructive/90">Please try refreshing the page or check your connection.</p>
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
                                <div className="rounded-lg border">
                                    <table className="w-full" role="table" aria-label="Facts table">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-4 py-3 w-12" scope="col">
                                                    <Checkbox
                                                        checked={filteredFacts.length > 0 && selectedFacts.size === filteredFacts.length}
                                                        onCheckedChange={handleSelectAll}
                                                        aria-label="Select all facts"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left font-semibold text-sm" scope="col">Name</th>
                                                <th className="px-4 py-3 text-left font-semibold text-sm" scope="col">Type</th>
                                                <th className="px-4 py-3 text-left font-semibold text-sm" scope="col">Values</th>
                                                <th className="px-4 py-3 text-right font-semibold text-sm" scope="col">Actions</th>
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
                            <div className="text-center py-12" role="status" aria-live="polite">
                                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                                <h3 className="font-semibold text-lg mb-2">No matching facts found</h3>
                                <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                    <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">No facts added yet</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                                    Facts provide important information about your tours.
                                    They'll appear here once added.
                                </p>
                                <Button
                                    onClick={() => setIsAddFactOpen(true)}
                                    variant="outline"
                                    aria-label="Create your first fact"
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
                <DialogContent className="max-w-md" role="alertdialog">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Confirm Bulk Deletion</DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Are you sure you want to delete {selectedFacts.size} fact(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button 
                            variant="outline" 
                            onClick={() => setBulkDeleteDialogOpen(false)}
                            aria-label="Cancel deletion"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleBulkDelete}
                            aria-label={`Delete ${selectedFacts.size} facts`}
                        >
                            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                            Delete {selectedFacts.size} Fact(s)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TourFacts;
