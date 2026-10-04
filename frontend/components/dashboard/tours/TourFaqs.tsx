'use client';

import { useMemo, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFaq } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { HelpCircle, Plus, Trash2, MessageCircle, MessageSquare, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTourContext } from '@/providers/TourProvider';
import type { FaqData } from '@/types/faq';
import { getUserId } from '@/lib/utils/auth';
import AddFaq from './Faq/AddFaq';
import { getUserFaq } from '@/lib/api/faqApi';

export function TourFAQs() {
    const { faqFields, appendFaq, faqRemove, faqMove, form } = useTourContext();
    const { control, setValue, watch } = form;
    const queryClient = useQueryClient();

    const faqs = watch('faqs'); // Watch entire array, not individual
    const userId = getUserId();

    // State for AddFaq dialog
    const [isAddFaqDialogOpen, setIsAddFaqDialogOpen] = useState(false);
    const [currentFaqIndex, setCurrentFaqIndex] = useState<number | null>(null);

    // State for Popover open/close per FAQ item
    const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});


    const { data: faqData } = useFaq(userId, !!userId);
    const faq = (faqData as { data?: FaqData[] })?.data || [];

    // Derive hasManuallyAddedFaqs directly from faqFields instead of using effect-based state
    const hasManuallyAddedFaqs = useMemo(() => {
        return Array.isArray(faqFields) && faqFields.length > 0;
    }, [faqFields]);

    const handleAddFaq = () => {
        appendFaq({ question: '', answer: '' });
    };

    const handleAddFirstFaq = () => {
        const index = Array.isArray(faqFields) ? faqFields.length : 0;
        handleAddFaq();
        setCurrentFaqIndex(index);
        setIsAddFaqDialogOpen(true);
    };

    const handleFaqSelect = (faqData: FaqData | undefined, index: number) => {
        if (faqData) {
            setValue(`faqs.${index}.faqId`, faqData.id || faqData._id, { shouldDirty: true, shouldValidate: false });
            setValue(`faqs.${index}.question`, faqData.question || '', { shouldDirty: true, shouldValidate: false });
            setValue(`faqs.${index}.answer`, faqData.answer || '', { shouldDirty: true, shouldValidate: false });
            setOpenPopovers(prev => ({ ...prev, [index]: false }));
        }
    };

    const setPopoverOpen = (index: number, open: boolean) => {
        setOpenPopovers(prev => ({ ...prev, [index]: open }));
    };

    const handleFaqAdded = async () => {
        if (userId) {
            await queryClient.invalidateQueries({ queryKey: ['faq', userId] });

            const updatedFaqs = await queryClient.fetchQuery({
                queryKey: ['faq', userId],
                queryFn: () => getUserFaq(userId),
            });

            if (currentFaqIndex !== null && updatedFaqs && Array.isArray(updatedFaqs) && updatedFaqs.length > 0) {
                const newFaq = updatedFaqs[updatedFaqs.length - 1];
                if (newFaq) {
                    handleFaqSelect(newFaq, currentFaqIndex);
                }
            }
            setCurrentFaqIndex(null);
        }
        setIsAddFaqDialogOpen(false);
    };

    useEffect(() => {
        if (faqFields && faqFields.length > 0 && faq && faq.length > 0) {
            faqFields.forEach((field: FaqData, index: number) => {
                if (field.faqId) {
                    const matchedFaq = faq.find((f: FaqData) => f.id === field.id || f._id === field.id);
                    if (matchedFaq) {
                        setValue(`faqs.${index}.question`, matchedFaq.question, { shouldDirty: false });
                        setValue(`faqs.${index}.answer`, matchedFaq.answer, { shouldDirty: false });
                    }
                } else if (field.question) {
                    const matchedFaq = faq.find((f: FaqData) => f.question === field.question || f.question.trim() === field?.question?.trim());
                    if (matchedFaq) {
                        setValue(`faqs.${index}.faqId`, matchedFaq.id || matchedFaq._id, { shouldDirty: false });
                        setValue(`faqs.${index}.question`, matchedFaq.question, { shouldDirty: false });
                        setValue(`faqs.${index}.answer`, matchedFaq.answer, { shouldDirty: false });
                    }
                }
            });
        }
    }, [faqFields, faq, setValue]);


    // Handle drag start
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index.toString());
    };

    // Handle drag over
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Handle drop
    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
        if (dragIndex !== dropIndex) {
            faqMove(dragIndex, dropIndex);
        }
    };

    return (
        <Card className="shadow-xs pt-0">
            <CardHeader className="bg-secondary border-b pt-4 rounded-t-sm">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl font-semibold">Frequently Asked Questions</CardTitle>
                </div>
                <CardDescription>
                    Add common questions and answers about the tour
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-md font-medium">Tour FAQs</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={handleAddFaq}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add FAQ</span>
                    </Button>
                </div>

                {hasManuallyAddedFaqs ? (
                    <div className="space-y-4 pt-0">
                        {Array.isArray(faqFields) && faqFields.map((field, index) => {
                            // FIXED: Better check for FAQ content
                            const currentFaq = faqs?.[index];
                            const hasFaq = currentFaq?.question && currentFaq.question.trim() !== '';

                            return (
                                <Card
                                    key={field.id}
                                    draggable
                                    onDragStart={(e: React.DragEvent) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className={cn(
                                        "border overflow-hidden transition-all py-0 cursor-move hover:shadow-md transition-shadow",
                                        hasFaq ? "border-border" : "bg-secondary/50"
                                    )}
                                >
                                    {hasFaq ? (
                                        <Accordion type="single" collapsible className="w-full pt-0 pb-0">
                                            <AccordionItem value={`item-${index}`} className="border-none">
                                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/70">
                                                    <div className="flex items-center space-x-3 w-full">
                                                        <Badge
                                                            variant="default"
                                                            className="rounded-md h-7 w-7 p-0 flex items-center justify-center"
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                        </Badge>
                                                        <div className="flex-1 font-medium text-base truncate">
                                                            {currentFaq?.question || `Question ${index + 1}`}
                                                        </div>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                faqRemove(index);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.stopPropagation();
                                                                    faqRemove(index);
                                                                }
                                                            }}
                                                            className="ml-auto h-8 w-8 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Remove</span>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-6 pb-6 pt-2 border-t border-border">
                                                    <div className="grid grid-cols-1 gap-5 mt-2">
                                                        <FormField
                                                            control={control}
                                                            name={`faqs.${index}.question`}
                                                            render={() => (
                                                                <FormItem>
                                                                    <FormLabel className="flex items-center gap-1">
                                                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                                                        <span>Question</span>
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Popover
                                                                            open={openPopovers[index] || false}
                                                                            onOpenChange={(open) => setPopoverOpen(index, open)}
                                                                        >
                                                                            <PopoverTrigger asChild>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    role="combobox"
                                                                                    aria-expanded={openPopovers[index] || false}
                                                                                    className="w-full justify-between"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                    }}
                                                                                >
                                                                                    <span className={cn(
                                                                                        "truncate",
                                                                                        !currentFaq?.question && "text-muted-foreground"
                                                                                    )}>
                                                                                        {currentFaq?.question || "Select a question"}
                                                                                    </span>
                                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-full p-0" align="start">
                                                                                <Command>
                                                                                    <CommandInput
                                                                                        placeholder="Search FAQs..."
                                                                                        className="!focus:outline-none !focus:ring-0 !focus:shadow-none !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus-visible:shadow-none !focus-visible:ring-offset-[0px]"
                                                                                        style={{ '--tw-ring-shadow': 'none', '--tw-ring-offset-shadow': 'none' } as React.CSSProperties}
                                                                                    />
                                                                                    <CommandList>
                                                                                        <CommandEmpty>No FAQs found.</CommandEmpty>
                                                                                        <CommandGroup>
                                                                                            {faq?.map((faqItem: FaqData) => {
                                                                                                const isSelected = currentFaq?.faqId === (faqItem.id || faqItem._id);
                                                                                                return (
                                                                                                    <CommandItem
                                                                                                        className="cursor-pointer"
                                                                                                        key={faqItem.id || faqItem._id}
                                                                                                        value={`${faqItem.question} ${faqItem.answer || ''}`}
                                                                                                        onSelect={() => handleFaqSelect(faqItem, index)}
                                                                                                        onMouseDown={(e) => {
                                                                                                            // Prevent form validation when selecting
                                                                                                            e.preventDefault();
                                                                                                            handleFaqSelect(faqItem, index);
                                                                                                        }}
                                                                                                    >
                                                                                                        <Check
                                                                                                            className={cn(
                                                                                                                "mr-2 h-4 w-4",
                                                                                                                isSelected ? "opacity-100" : "opacity-0"
                                                                                                            )}
                                                                                                        />
                                                                                                        {faqItem.question}
                                                                                                    </CommandItem>
                                                                                                );
                                                                                            })}
                                                                                            <CommandItem
                                                                                                value="add-custom-faq"
                                                                                                className="cursor-pointer"
                                                                                                onSelect={() => {
                                                                                                    setCurrentFaqIndex(index);
                                                                                                    setIsAddFaqDialogOpen(true);
                                                                                                    setPopoverOpen(index, false);
                                                                                                }}
                                                                                            >
                                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                                    Add FAQ
                                                                                            </CommandItem>
                                                                                        </CommandGroup>
                                                                                    </CommandList>
                                                                                </Command>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={control}
                                                            name={`faqs.${index}.answer`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="flex items-center gap-1">
                                                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                                        <span>Answer</span>
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Textarea
                                                                            {...field}
                                                                            placeholder="Enter detailed answer to the question"
                                                                            className="min-h-[120px] resize-y"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    ) : (
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Badge variant="outline"
                                                    className="rounded-md h-7 w-7 p-0 flex items-center justify-center font-medium">
                                                    <HelpCircle className="h-4 w-4" />
                                                </Badge>
                                                <div className="flex-1 font-medium text-base text-muted-foreground">
                                                    New FAQ
                                                </div>
                                            </div>

                                            <FormField
                                                control={control}
                                                name={`faqs.${index}.faqId`}
                                                render={() => (
                                                    <FormItem className="w-full">
                                                        <FormControl>
                                                            <Popover
                                                                open={openPopovers[index] || false}
                                                                onOpenChange={(open) => setPopoverOpen(index, open)}
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        aria-expanded={openPopovers[index] || false}
                                                                        className="w-full justify-between"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                        }}
                                                                    >
                                                                        <span className={cn(
                                                                            "truncate",
                                                                            !currentFaq?.question && "text-muted-foreground"
                                                                        )}>
                                                                            {currentFaq?.question || "Select a question"}
                                                                        </span>
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-full p-0" align="start">
                                                                    <Command>
                                                                        <CommandInput
                                                                            placeholder="Search FAQs..."
                                                                            className="focus:outline-none focus:ring-0 focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none"
                                                                        />
                                                                        <CommandList>
                                                                            <CommandEmpty>No FAQs found.</CommandEmpty>
                                                                            <CommandGroup>
                                                                                {Array.isArray(faq) && faq.length > 0 ? faq.map((faqItem: FaqData) => {
                                                                                    const isSelected = currentFaq?.faqId === (faqItem.id || faqItem._id);
                                                                                    return (
                                                                                        <CommandItem
                                                                                            key={faqItem.id || faqItem._id}
                                                                                            value={`${faqItem.question} ${faqItem.answer || ''}`}
                                                                                            onSelect={() => handleFaqSelect(faqItem, index)}
                                                                                            onMouseDown={(e) => {
                                                                                                // Prevent form validation when selecting
                                                                                                e.preventDefault();
                                                                                                handleFaqSelect(faqItem, index);
                                                                                            }}
                                                                                            className="cursor-pointer"
                                                                                        >
                                                                                            <Check
                                                                                                className={cn(
                                                                                                    "mr-2 h-4 w-4",
                                                                                                    isSelected ? "opacity-100" : "opacity-0"
                                                                                                )}
                                                                                            />
                                                                                            {faqItem.question}
                                                                                        </CommandItem>
                                                                                    );
                                                                                }) : null}
                                                                                <CommandItem
                                                                                    value="add-custom-faq"
                                                                                    onSelect={() => {
                                                                                        setCurrentFaqIndex(index);
                                                                                        setIsAddFaqDialogOpen(true);
                                                                                        setPopoverOpen(index, false);
                                                                                    }}
                                                                                    onMouseDown={(e) => {
                                                                                        // Prevent form validation when clicking "Add Custom FAQ"
                                                                                        e.preventDefault();
                                                                                        setCurrentFaqIndex(index);
                                                                                        setIsAddFaqDialogOpen(true);
                                                                                        setPopoverOpen(index, false);
                                                                                    }}
                                                                                    className="text-primary font-medium"
                                                                                >
                                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                                    Add FAQ
                                                                                </CommandItem>
                                                                            </CommandGroup>
                                                                        </CommandList>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    faqRemove(index);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.stopPropagation();
                                                        faqRemove(index);
                                                    }
                                                }}
                                                className="h-10 w-10 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Remove</span>
                                            </div>
                                        </div>
                                    )
                                    }
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-10 rounded-lg border-2 border-dashed border-border text-center bg-secondary">
                        <div className="bg-primary/10 p-3 rounded-full mb-3">
                            <HelpCircle className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-medium text-lg mb-1">No FAQs added yet</h3>
                        <p className="text-muted-foreground mb-5 max-w-md">
                            Add frequently asked questions to help your customers get quick answers to common inquiries
                        </p>
                        <Button
                            type="button"
                            onClick={handleAddFirstFaq}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            <span>Add FAQ</span>
                        </Button>
                    </div>
                )}
            </CardContent>

            {/* Add Custom FAQ Dialog */}
            <Dialog open={isAddFaqDialogOpen} onOpenChange={setIsAddFaqDialogOpen}>
                <DialogContent
                    className="max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => {
                        // Prevent dialog clicks from triggering parent form validation
                        e.stopPropagation();
                    }}
                    onPointerDownOutside={(e) => {
                        // Prevent outside clicks from triggering parent form validation
                        e.preventDefault();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Add Custom FAQ</DialogTitle>
                        <DialogDescription>
                            Create a new frequently asked question that will be added to your FAQ library and can be reused in other tours.
                        </DialogDescription>
                    </DialogHeader>
                    <div onClick={(e) => e.stopPropagation()}>
                        <AddFaq onFaqAdded={handleFaqAdded} />
                    </div>
                </DialogContent>
            </Dialog>
        </Card >
    );
}