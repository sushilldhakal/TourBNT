import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addFaq } from "@/lib/api/faqApi";
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, MessageCircle, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/hooks/useAuth";

const formSchema = z.object({
    question: z.string().min(5, "Question must be at least 5 characters"),
    answer: z.string().min(10, "Answer must be at least 10 characters"),
    userId: z.string().optional(),
});

type FaqFormData = z.infer<typeof formSchema>;

const AddFaq = ({ onFaqAdded }: { onFaqAdded: () => void }) => {
    const { userId } = useAuth();

    const form = useForm<FaqFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            question: '',
            answer: '',
            userId: userId || '',
        },
    });

    const faqsMutation = useMutation({
        mutationFn: (data: FormData) => addFaq(data),
        onSuccess: () => {
            toast({
                title: 'FAQ added successfully',
                description: 'Your FAQ has been added to the list.',
                variant: 'default',
            });
            onFaqAdded();
            form.reset();
        },
        onError: () => {
            toast({
                title: 'Failed to create FAQ',
                description: `An error occurred while creating the FAQ.`,
                variant: 'destructive',
            });
        },
    });

    const handleCreateFaq = async (values: FaqFormData) => {
        const formData = new FormData();
        formData.append('question', values.question);
        formData.append('answer', values.answer);
        formData.append('userId', values.userId || '');

        try {
            await faqsMutation.mutateAsync(formData);
        } catch {
            toast({
                title: 'Failed to create FAQ',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleCreateFaq)();
            }}>
                <Card className="shadow-xs border-primary/20">
                    <CardHeader className="bg-primary/5 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" />
                            <CardTitle className="text-lg">Create New FAQ</CardTitle>
                        </div>
                        <CardDescription>
                            Add frequently asked questions to help your customers
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
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
                                            placeholder="What's included in the tour package?"
                                            className="focus-visible:ring-primary"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Add a common question asked for many tours
                                    </p>
                                </FormItem>
                            )}
                        />

                        <Separator />

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
                                            rows={5}
                                            placeholder="Provide a detailed and helpful answer"
                                            className="focus-visible:ring-primary resize-y min-h-[120px]"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Be thorough but concise in your response
                                    </p>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t p-4 flex justify-end gap-2">
                        <Button
                            type="submit"
                            disabled={faqsMutation.isPending}
                            className="gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create FAQ
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
};

export default AddFaq;
