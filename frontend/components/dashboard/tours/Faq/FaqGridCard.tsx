import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, MessageCircle, Save, Trash2, X, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FaqData } from "./useFaq";
import { useFaqItem } from "./useFaqItem";

interface FaqGridCardProps {
    faq?: FaqData;
    DeleteFaq?: (id: string) => void;
}

const FaqGridCard = ({
    faq,
    DeleteFaq,
}: FaqGridCardProps) => {
    const {
        isEditMode,
        deleteDialogOpen,
        setDeleteDialogOpen,
        form,
        isLoading,
        isError,
        updateFaqMutation,
        handleUpdateFaq,
        handleDeleteFaq,
        confirmDeleteFaq,
        handleEditClick,
        handleCancelClick,
    } = useFaqItem({ faq, DeleteFaq });

    if (isLoading) return (
        <Card className="shadow-xs animate-pulse">
            <CardContent className="p-6 space-y-4">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-20 bg-muted rounded w-full"></div>
            </CardContent>
        </Card>
    );

    if (isError) return (
        <Card className="shadow-xs border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
                <p className="text-destructive">Failed to load FAQ data</p>
            </CardContent>
        </Card>
    );

    return (
        <Form {...form}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit(handleUpdateFaq)(e);
                }}
            >
                <Card className={cn(
                    "shadow-xs overflow-hidden transition-all h-full flex py-0 flex-col",
                    isEditMode ? "border-primary/30 bg-primary/5" : "hover:border-border/80"
                )}>
                    <CardContent className="p-0 flex-1">
                        {isEditMode ? (
                            <div className="p-5 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-primary/10 text-primary">Editing</Badge>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="question"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1.5">
                                                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                                                Question
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter frequently asked question"
                                                    className="focus-visible:ring-primary"
                                                />
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
                                            <FormLabel className="flex items-center gap-1.5">
                                                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                                                Answer
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    rows={4}
                                                    placeholder="Provide a clear, helpful answer"
                                                    className="focus-visible:ring-primary resize-y min-h-[120px]"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ) : (
                            <div className="p-5">
                                <div className="mb-3">
                                    <h3 className="font-semibold text-base text-foreground flex items-start gap-2">
                                        <HelpCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
                                        <span>{faq?.question}</span>
                                    </h3>
                                </div>
                                <Separator className="my-3" />
                                <div className="mt-3">
                                    <p className="text-muted-foreground whitespace-pre-line line-clamp-4">
                                        {faq?.answer}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className={cn(
                        "flex justify-end gap-2 px-5 py-3 bg-secondary/50 border-t",
                        isEditMode && "bg-primary/5 border-primary/20"
                    )}>
                        {isEditMode ? (
                            <>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={updateFaqMutation.isPending}
                                    className="gap-1.5"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelClick}
                                    className="gap-1.5"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEditClick(e);
                                    }}
                                    className="text-muted-foreground hover:text-primary gap-1.5"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                    Edit
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteFaq();
                                    }}
                                    className="text-muted-foreground hover:text-destructive gap-1.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </Button>
                            </>
                        )}
                    </CardFooter>
                </Card>
            </form>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this FAQ? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeleteFaq}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Form>
    );
};

export default FaqGridCard;
