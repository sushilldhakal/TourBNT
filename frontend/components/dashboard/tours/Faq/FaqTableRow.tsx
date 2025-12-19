import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, Trash2, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FaqData } from "./useFaq";
import { useFaqItem } from "./useFaqItem";

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
    const {
        isEditMode,
        deleteDialogOpen,
        setDeleteDialogOpen,
        form,
        updateFaqMutation,
        handleUpdateFaq,
        confirmDeleteFaq,
        handleEditClick,
        handleCancelClick,
    } = useFaqItem({ faq, DeleteFaq });

    if (isEditMode) {
        return (
            <tr className="border-b bg-primary/5">
                <td colSpan={4} className="p-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleUpdateFaq)} className="space-y-4">
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
