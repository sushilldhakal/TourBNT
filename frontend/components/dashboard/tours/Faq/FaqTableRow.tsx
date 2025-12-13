import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { getSingleFaq, updateFaq } from "@/lib/api/faqApi";
import { FaqData } from "./useFaq";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Edit, Save, Trash2, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface FaqTableRowProps {
    faq?: FaqData;
    DeleteFaq?: (id: string) => void;
    isSelected?: boolean;
    onSelectChange?: (id: string, checked: boolean) => void;
}

const FaqTableRow = ({
    faq,
    DeleteFaq,
    isSelected = false,
    onSelectChange,
}: FaqTableRowProps) => {
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const queryClient = useQueryClient();
    const form = useForm({
        defaultValues: {
            question: faq?.question || '',
            answer: faq?.answer || '',
            userId: '',
        },
    });

    const { data: faqSingle } = useQuery<FaqData>({
        queryKey: ['singleFaq', editingFaqId],
        queryFn: () => editingFaqId ? getSingleFaq(editingFaqId) : Promise.reject('No faq ID provided'),
        enabled: isEditMode && !!editingFaqId,
    });

    useEffect(() => {
        if (faqSingle && isEditMode) {
            form.setValue('question', faqSingle.question);
            form.setValue('answer', faqSingle.answer);
        } else if (faq && isEditMode) {
            form.setValue('question', faq.question);
            form.setValue('answer', faq.answer);
        }
    }, [faqSingle, isEditMode, form, faq]);

    const updateFaqMutation = useMutation({
        mutationFn: (faqData: FormData) => updateFaq(faqData, faq?.id || faq?._id || ''),
        onSuccess: () => {
            toast({
                title: 'FAQ updated successfully',
                description: 'Your changes have been saved.',
            });
            setEditingFaqId(null);
            setIsEditMode(false);
            queryClient.invalidateQueries({ queryKey: ['Faq'] });
        },
        onError: () => {
            toast({
                title: 'Failed to update FAQ',
                description: 'An error occurred while saving changes.',
                variant: 'destructive',
            });
        },
    });

    const handleUpdateFaq = async () => {
        const formData = new FormData();
        formData.append('question', form.getValues('question') || '');
        formData.append('answer', form.getValues('answer') || '');

        try {
            await updateFaqMutation.mutateAsync(formData);
        } catch (error) {
            toast({
                title: 'Failed to update FAQ',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        }
    };

    const confirmDeleteFaq = () => {
        if (DeleteFaq && (faq?.id || faq?._id)) {
            DeleteFaq(faq.id || faq._id as string);
            setDeleteDialogOpen(false);
        }
    };

    const handleEditClick = () => {
        if (faq) {
            setEditingFaqId(faq.id || faq._id || '');
            setIsEditMode(true);
        }
    };

    const handleCancelClick = () => {
        setEditingFaqId(null);
        setIsEditMode(false);
        form.reset();
    };

    if (isEditMode) {
        return (
            <tr className="border-b bg-primary/5">
                <td colSpan={4} className="p-4">
                    <Form {...form}>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            form.handleSubmit(handleUpdateFaq)();
                        }} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="question"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Enter question" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="answer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Answer</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} rows={3} placeholder="Enter answer" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="submit" size="sm" disabled={updateFaqMutation.isPending}>
                                    <Save className="h-3.5 w-3.5 mr-1" />
                                    Save
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleCancelClick}>
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Form>
                </td>
            </tr>
        );
    }

    return (
        <>
            <tr className="border-b hover:bg-muted/50 transition-colors">
                <td className="p-4 w-12">
                    <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                                if (onSelectChange && (faq?.id || faq?._id) && typeof checked === 'boolean') {
                                    onSelectChange(faq.id || faq._id as string, checked);
                                }
                            }}
                        />
                    </div>
                </td>
                <td className="p-4 font-medium max-w-xs">
                    <p className="line-clamp-2">{faq?.question}</p>
                </td>
                <td className="p-4 text-muted-foreground max-w-md">
                    <p className="line-clamp-2">{faq?.answer}</p>
                </td>
                <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditClick}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </td>
            </tr>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this FAQ? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteFaq}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default FaqTableRow;
