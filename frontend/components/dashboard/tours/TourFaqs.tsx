'use client';

import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Plus, Trash2, MessageCircle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTourContext } from '@/providers/TourProvider';
import { getUserFaq } from '@/lib/api/faqApi';
import { FaqData } from '@/lib/types';
import { getUserId } from '@/lib/utils/auth';

/**
 * TourFAQs Component
 * Manages tour FAQs with field arrays from TourProvider
 * Allows selecting from master FAQ list and customizing answers
 */

export function TourFAQs() {
    const { control, setValue, watch } = useFormContext();
    const { faqFields, appendFaq, faqRemove } = useTourContext();

    const [hasManuallyAddedFaqs, setHasManuallyAddedFaqs] = useState(false);
    const watchedFaq = watch('faqs');
    const userId = getUserId();

    // Fetch user's FAQs
    const { data: faq } = useQuery({
        queryKey: ['faq', userId],
        queryFn: () => getUserFaq(userId!),
        enabled: !!userId,
    });

    useEffect(() => {
        if (Array.isArray(faqFields) && faqFields.length > 0) {
            setHasManuallyAddedFaqs(true);
        } else {
            setHasManuallyAddedFaqs(false);
        }
    }, [faqFields]);

    const handleAddFaq = () => {
        setHasManuallyAddedFaqs(true);
        appendFaq({ question: '', answer: '' });
    };

    const handleFaqSelect = (faqData: FaqData | undefined, index: number) => {
        if (faqData) {
            console.log(`✅ Linked FAQ "${faqData.question}" with faqId: ${faqData.id || faqData._id}`);
            setValue(`faqs.${index}.faqId`, faqData.id || faqData._id);
            setValue(`faqs.${index}.question`, faqData.question || '');
            setValue(`faqs.${index}.answer`, faqData.answer || '');
            console.log(`   Current form value:`, watch(`faqs.${index}`));
        }
    };

    // Sync form when master FAQs change
    useEffect(() => {
        if (faqFields && faqFields.length > 0 && faq && faq.length > 0) {
            faqFields.forEach((field: any, index) => {
                // Match by faqId first, then fall back to question matching
                if (field.faqId) {
                    const matchedFaq = faq.find((f: FaqData) => f.id === field.faqId || f._id === field.faqId);
                    if (matchedFaq) {
                        console.log(`🔄 Syncing FAQ at index ${index} with master FAQ "${matchedFaq.question}"`);
                        setValue(`faqs.${index}.question`, matchedFaq.question);
                        setValue(`faqs.${index}.answer`, matchedFaq.answer);
                    }
                } else if (field.question) {
                    // Legacy: match by question if no faqId
                    const matchedFaq = faq.find((f: FaqData) => f.question === field.question || f.question.trim() === field?.question?.trim());
                    if (matchedFaq) {
                        setValue(`faqs.${index}.faqId`, matchedFaq.id || matchedFaq._id);
                        setValue(`faqs.${index}.question`, matchedFaq.question);
                        setValue(`faqs.${index}.answer`, matchedFaq.answer);
                    }
                }
            });
        }
    }, [faqFields, faq, setValue, watch]);

    return (
        <Card className="shadow-xs">
            <CardHeader className="bg-secondary border-b pb-6">
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

                {/* Show FAQs if manually added */}
                {hasManuallyAddedFaqs ? (
                    <div className="space-y-4">
                        {Array.isArray(faqFields) && faqFields.map((field, index) => {
                            // Check if the FAQ has actual content
                            const hasFaq = watchedFaq && Array.isArray(watchedFaq) && watchedFaq[index]?.question;

                            return (
                                <Card
                                    key={field.id}
                                    className={cn(
                                        "border overflow-hidden transition-all",
                                        hasFaq ? "border-border" : "bg-secondary/50"
                                    )}
                                >
                                    {hasFaq ? (
                                        <Accordion type="single" collapsible className="w-full">
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
                                                            {watchedFaq[index]?.question || `Question ${index + 1}`}
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
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="flex items-center gap-1">
                                                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                                                        <span>Question</span>
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Select
                                                                            onValueChange={(value) => {
                                                                                const faqData = faq?.find((f: FaqData) => f.id === value || f._id === value);
                                                                                handleFaqSelect(faqData, index);
                                                                            }}
                                                                            value={watchedFaq?.[index]?.faqId || watchedFaq?.[index]?.question}
                                                                        >
                                                                            <SelectTrigger className="w-full">
                                                                                <SelectValue placeholder="Select a question" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {faq?.map((faqItem: FaqData, faqIndex: number) => (
                                                                                    <SelectItem key={faqIndex} value={faqItem.id || faqItem._id || ''}>
                                                                                        {faqItem.question}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
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

                                            <div className="flex space-x-2">
                                                <FormField
                                                    control={control}
                                                    name={`faqs.${index}.question`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-full">
                                                            <FormControl>
                                                                <Select
                                                                    onValueChange={(value) => {
                                                                        const faqData = faq && Array.isArray(faq) ?
                                                                            faq.find(f => f.id === value || f._id === value) :
                                                                            undefined;
                                                                        handleFaqSelect(faqData, index);
                                                                    }}
                                                                    value={watchedFaq?.[index]?.faqId || watchedFaq?.[index]?.question}
                                                                >
                                                                    <SelectTrigger className="w-[220px]">
                                                                        <SelectValue placeholder="Select a question" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {Array.isArray(faq) && faq.length > 0 ? faq.map((faqItem, faqIndex) => (
                                                                            <SelectItem key={faqIndex} value={faqItem.id || faqItem._id || ''}>
                                                                                {faqItem.question}
                                                                            </SelectItem>
                                                                        )) : (
                                                                            <SelectItem disabled value="no-faqs">No FAQs available</SelectItem>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
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
                                        </div>
                                    )}
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
                            onClick={handleAddFaq}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            <span>Add First FAQ</span>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
