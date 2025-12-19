import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { getSingleFaq, updateFaq } from '@/lib/api/faqApi';
import { FaqData } from './useFaq';

interface UseFaqItemProps {
    faq?: FaqData;
    DeleteFaq?: (id: string) => void;
}

// Validation schema
const faqSchema = z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required'),
    userId: z.string().optional(),
});

export const useFaqItem = ({ faq, DeleteFaq }: UseFaqItemProps) => {
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const isInitializingRef = useRef(false);

    const queryClient = useQueryClient();
    
    const form = useForm({
        resolver: zodResolver(faqSchema),
        defaultValues: {
            question: faq?.question || '',
            answer: faq?.answer || '',
            userId: '',
        },
        mode: 'onChange',
    });

    const { data: faqSingle, isLoading, isError } = useQuery<FaqData | { faq: FaqData }>({
        queryKey: ['singleFaq', editingFaqId],
        queryFn: () => editingFaqId ? getSingleFaq(editingFaqId) : Promise.reject('No faq ID provided'),
        enabled: isEditMode && !!editingFaqId,
    });

    // Update form values when entering edit mode or when data loads
    useEffect(() => {
        if (isEditMode && !isInitializingRef.current) {
            // Extract FAQ data - handle both { faq: ... } and direct FAQ object
            const faqData = (faqSingle as any)?.faq || faqSingle;
            
            if (faqData && (faqData.question || faqData.answer)) {
                console.log('Setting form values from API:', faqData);
                isInitializingRef.current = true;
                form.reset({
                    question: faqData.question || '',
                    answer: faqData.answer || '',
                    userId: '',
                });
                // Reset the flag after a short delay to allow form to update
                setTimeout(() => {
                    isInitializingRef.current = false;
                }, 100);
            } else if (faq && !faqSingle) {
                // Fallback to prop data - only if we don't have API data yet
                console.log('Setting form values from prop:', faq);
                isInitializingRef.current = true;
                form.reset({
                    question: faq.question || '',
                    answer: faq.answer || '',
                    userId: '',
                });
                setTimeout(() => {
                    isInitializingRef.current = false;
                }, 100);
            }
        }
    }, [faqSingle, isEditMode, form, faq]);

    const updateFaqMutation = useMutation({
        mutationFn: (faqData: { question: string; answer: string }) => updateFaq(faqData, faq?.id || faq?._id || ''),
        onSuccess: () => {
            toast({
                title: 'FAQ updated successfully',
                description: 'Your changes have been saved.',
            });
            setEditingFaqId(null);
            setIsEditMode(false);
            isInitializingRef.current = false;
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

    const handleUpdateFaq = async (data: { question: string; answer: string }) => {
        // Prevent submission if we're still initializing
        if (isInitializingRef.current) {
            return;
        }
        // Data is already validated by the form schema
        try {
            await updateFaqMutation.mutateAsync(data);
        } catch (error) {
            toast({
                title: 'Failed to update FAQ',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteFaq = () => {
        setDeleteDialogOpen(true);
    };

    const confirmDeleteFaq = () => {
        if (DeleteFaq && (faq?.id || faq?._id)) {
            DeleteFaq(faq.id || faq._id as string);
            setDeleteDialogOpen(false);
            toast({
                title: 'FAQ deleted successfully',
                description: 'The FAQ has been removed.',
            });
        } else {
            toast({
                title: 'Failed to delete FAQ',
                description: 'An error occurred while deleting the FAQ.',
                variant: 'destructive',
            });
            setDeleteDialogOpen(false);
        }
    };

    const handleEditClick = (e?: React.MouseEvent) => {
        // Prevent any form submission or event bubbling
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (faq) {
            const faqId = faq.id || faq._id || '';
            // If already editing this FAQ, do nothing
            if (editingFaqId === faqId && isEditMode) {
                return;
            }
            
            // Reset form first to prevent conflicts
            form.reset({
                question: faq.question || '',
                answer: faq.answer || '',
                userId: '',
            });
            
            setEditingFaqId(faqId);
            setIsEditMode(true);
            isInitializingRef.current = false;
        }
    };

    const handleCancelClick = () => {
        setEditingFaqId(null);
        setIsEditMode(false);
        isInitializingRef.current = false;
        // Reset to original values
        form.reset({
            question: faq?.question || '',
            answer: faq?.answer || '',
            userId: '',
        });
    };

    return {
        // State
        isEditMode,
        deleteDialogOpen,
        setDeleteDialogOpen,
        
        // Form
        form,
        
        // Data
        faqSingle,
        isLoading,
        isError,
        
        // Mutations
        updateFaqMutation,
        
        // Handlers
        handleUpdateFaq,
        handleDeleteFaq,
        confirmDeleteFaq,
        handleEditClick,
        handleCancelClick,
    };
};
