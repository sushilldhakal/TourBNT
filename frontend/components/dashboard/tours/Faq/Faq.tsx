"use client";

import { useQueryClient } from "@tanstack/react-query";
import { deleteFaq, deleteMultipleFaqs } from "@/lib/api/faqApi";
import { toast } from "@/components/ui/use-toast";
import AddFaq from "./AddFaq";
import { getUserId } from "@/lib/auth/authUtils";
import FaqGridCard from "./FaqGridCard";
import FaqTableRow from "./FaqTableRow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFaq } from "./useFaq";
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

const TourFaqs = () => {
    const userId = getUserId();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddFaqOpen, setIsAddFaqOpen] = useState(false);
    const [view, setView] = useState<'grid' | 'list'>(() => getViewPreference('faq'));
    const [selectedFaqs, setSelectedFaqs] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    const handleViewChange = (newView: 'grid' | 'list') => {
        setView(newView);
        setViewPreference('faq', newView);
    };

    const { data: faqs, isLoading, isError } = useFaq(userId);

    const handleDeleteFaqs = async (faqId: string) => {
        try {
            await deleteFaq(faqId);
            toast({
                title: 'FAQ deleted successfully',
                description: 'The FAQ has been removed.',
            });
            queryClient.invalidateQueries({
                queryKey: ['Faq', userId],
            });
        } catch (error) {
            toast({
                title: 'Failed to delete FAQ',
                description: 'An error occurred while deleting the FAQ.',
                variant: 'destructive',
            });
        }
    };

    const handleSelectFaq = (faqId: string, checked: boolean) => {
        setSelectedFaqs(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(faqId);
            } else {
                newSet.delete(faqId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true && filteredFaqs) {
            setSelectedFaqs(new Set(filteredFaqs.map((faq: any) => faq.id || faq._id)));
        } else {
            setSelectedFaqs(new Set());
        }
    };

    const handleBulkDelete = async () => {
        try {
            const idsToDelete = Array.from(selectedFaqs);
            await deleteMultipleFaqs(idsToDelete);
            toast({
                title: 'FAQs deleted successfully',
                description: `${idsToDelete.length} FAQ(s) have been removed.`,
            });
            setSelectedFaqs(new Set());
            setBulkDeleteDialogOpen(false);
            queryClient.invalidateQueries({
                queryKey: ['Faq', userId],
            });
        } catch (error) {
            toast({
                title: 'Failed to delete FAQs',
                description: 'An error occurred while deleting the FAQs.',
                variant: 'destructive',
            });
        }
    };

    const filteredFaqs = faqs?.filter((faq: { question: string; answer: string }) =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex flex-col space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search FAQs..."
                                className="pl-9 w-full sm:w-[300px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <ViewToggle view={view} onViewChange={handleViewChange} />
                        {selectedFaqs.size > 0 && view === 'list' && (
                            <Button
                                variant="destructive"
                                onClick={() => setBulkDeleteDialogOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete ({selectedFaqs.size})
                            </Button>
                        )}
                        <Button
                            onClick={() => setIsAddFaqOpen(!isAddFaqOpen)}
                            className="flex items-center gap-2"
                        >
                            {isAddFaqOpen ? "Close Form" : "Add New FAQ"}
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Add FAQ Form */}
                {isAddFaqOpen && (
                    <div className="w-full">
                        <AddFaq onFaqAdded={() => {
                            if (userId) {
                                queryClient.invalidateQueries({
                                    queryKey: ['Faq', userId]
                                });
                                setIsAddFaqOpen(false);
                            }
                        }} />
                    </div>
                )}

                {/* FAQs List */}
                <Card className="shadow-xs border-border py-0">
                    <CardHeader className="bg-secondary/50 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-xl pt-4">Tour FAQs</CardTitle>
                        </div>
                        <CardDescription>
                            Answer common questions about your tours
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoading ? (
                            view === 'grid' ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map((i) => (
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
                                    {[1, 2, 3, 4].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            )
                        ) : isError ? (
                            <div className="bg-destructive/10 text-destructive rounded-md p-4">
                                <p className="font-medium">Failed to load FAQs</p>
                                <p className="text-sm">Please try refreshing the page or check your connection.</p>
                            </div>
                        ) : filteredFaqs?.length ? (
                            view === 'grid' ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {filteredFaqs.map((faq: any) => (
                                        <FaqGridCard
                                            key={faq.id || faq._id}
                                            faq={faq}
                                            DeleteFaq={handleDeleteFaqs}
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
                                                        checked={filteredFaqs.length > 0 && selectedFaqs.size === filteredFaqs.length}
                                                        onCheckedChange={handleSelectAll}
                                                    />
                                                </th>
                                                <th className="p-4 text-left font-medium">Question</th>
                                                <th className="p-4 text-left font-medium">Answer</th>
                                                <th className="p-4 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredFaqs.map((faq: any) => (
                                                <FaqTableRow
                                                    key={faq.id || faq._id}
                                                    faq={faq}
                                                    DeleteFaq={handleDeleteFaqs}
                                                    isSelected={selectedFaqs.has(faq.id || faq._id)}
                                                    onSelectChange={handleSelectFaq}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : faqs?.length ? (
                            <div className="text-center py-8">
                                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-medium text-lg mb-1">No matching FAQs found</h3>
                                <p className="text-muted-foreground">Try adjusting your search query</p>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                                <h3 className="font-medium text-lg mb-2">No FAQs added yet</h3>
                                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                    Create FAQs to answer common questions about your tours.
                                    They'll appear here once added.
                                </p>
                                <Button
                                    onClick={() => setIsAddFaqOpen(true)}
                                    variant="outline"
                                    className="mx-auto"
                                >
                                    Create your first FAQ
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
                            Are you sure you want to delete {selectedFaqs.size} FAQ(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete {selectedFaqs.size} FAQ(s)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TourFaqs;
