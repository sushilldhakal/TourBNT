import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSingleFact } from '@/lib/queries/useFacts';
import { toast } from '@/components/ui/use-toast';
import { updateFacts } from '@/lib/api/factsApi';
import { useAuth } from '@/lib/hooks/useAuth';
import type { UseFactItemProps } from '@/types/facts';

export const useFactItem = ({ fact, DeleteFact }: UseFactItemProps) => {
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [editingFactId, setEditingFactId] = useState<string | null>(null);
    const [valuesTag, setValuesTag] = useState<string[]>([]);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const isInitializingRef = useRef(false);

    const { userId } = useAuth();
    const queryClient = useQueryClient();

    const form = useForm({
        defaultValues: {
            name: fact?.name || '',
            field_type: fact?.field_type || '',
            value: Array.isArray(fact?.value) ? fact.value : [],
            icon: fact?.icon || '',
        },
    });

    const { watch } = form;
    const fieldType = watch('field_type');

    const { data: factSingle, isLoading, isError, refetch, error } = useSingleFact(editingFactId, isEditMode && !!editingFactId);

    // Helper function to parse fact values
    const parseFactValues = useCallback((factData: any): string[] => {
        let parsedValues: string[] = [];

        if (Array.isArray(factData.value)) {
            parsedValues = factData.value.map((item: any) => {
                if (typeof item === 'string') {
                    return item;
                } else if (typeof item === 'object' && item !== null && 'value' in item) {
                    return item.value;
                }
                return '';
            }).filter(Boolean);
        } else if (typeof factData.value === 'string') {
            try {
                const parsed = JSON.parse(factData.value);
                if (Array.isArray(parsed)) {
                    parsedValues = parsed.map((item: any) => {
                        if (typeof item === 'string') {
                            return item;
                        } else if (typeof item === 'object' && item !== null && 'value' in item) {
                            return item.value;
                        }
                        return '';
                    }).filter(Boolean);
                }
            } catch (e) {
                // Silent error
            }
        }

        return parsedValues;
    }, []);

    // Update form values when entering edit mode or when data loads
    useEffect(() => {
        if (isEditMode && !isInitializingRef.current) {
            // Extract fact data - handle both { facts: ... } and direct fact object
            const factData = (factSingle as any)?.facts || factSingle;

            if (factData && (factData.name || factData.field_type)) {
                isInitializingRef.current = true;

                const parsedValues = parseFactValues(factData);

                form.reset({
                    name: factData.name || '',
                    field_type: factData.field_type || '',
                    value: parsedValues,
                    icon: factData.icon || '',
                });

                setValuesTag(parsedValues);
                setSelectedIcon(factData.icon || null);

                // Reset the flag after a short delay
                setTimeout(() => {
                    isInitializingRef.current = false;
                }, 100);
            } else if (fact && !factSingle) {
                // Fallback to prop data - only if we don't have API data yet
                isInitializingRef.current = true;

                const parsedValues = parseFactValues(fact);

                form.reset({
                    name: fact.name || '',
                    field_type: fact.field_type || '',
                    value: parsedValues,
                    icon: fact.icon || '',
                });

                setValuesTag(parsedValues);
                setSelectedIcon(fact.icon || null);

                setTimeout(() => {
                    isInitializingRef.current = false;
                }, 100);
            }
        }
    }, [factSingle, isEditMode, form, fact, parseFactValues]);

    const updateFactMutation = useMutation({
        mutationFn: (factData: FormData) => updateFacts(factData, fact?.id || fact?._id || ''),
        onSuccess: () => {
            toast({
                title: 'Fact updated successfully',
                description: 'Your changes have been saved.',
            });
            setEditingFactId(null);
            setIsEditMode(false);
            isInitializingRef.current = false;
            queryClient.invalidateQueries({ queryKey: ['Facts'] });
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['Facts', userId] });
            }
        },
        onError: () => {
            toast({
                title: 'Failed to update fact',
                description: 'An error occurred while saving changes.',
                variant: 'destructive',
            });
        },
    });

    const handleUpdateFact = useCallback(async () => {
        // Prevent submission if we're still initializing
        if (isInitializingRef.current) {
            return;
        }

        const formData = new FormData();
        formData.append('name', form.getValues('name') || '');
        formData.append('field_type', form.getValues('field_type') || '');

        if (fieldType === 'Single Select' || fieldType === 'Multi Select') {
            const values = form.getValues('value');
            if (Array.isArray(values) && values.length > 0) {
                values.forEach((item, index) => {
                    const itemValue = typeof item === 'object' && item !== null && 'value' in item ? (item as any).value : String(item);
                    formData.append(`value[${index}]`, itemValue);
                });
            } else if (valuesTag.length > 0) {
                valuesTag.forEach((item, index) => {
                    formData.append(`value[${index}]`, item);
                });
            } else {
                formData.append('value', '[]');
            }
        }

        if (selectedIcon) {
            formData.append('icon', selectedIcon);
        }

        try {
            await updateFactMutation.mutateAsync(formData);
        } catch (error) {
            toast({
                title: 'Failed to update fact',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        }
    }, [fieldType, form, selectedIcon, updateFactMutation, valuesTag]);

    const handleDeleteFact = useCallback(() => {
        setDeleteDialogOpen(true);
    }, []);

    const confirmDeleteFact = useCallback(() => {
        const factId = fact?.id || fact?._id;
        if (DeleteFact && factId) {
            DeleteFact(factId);
            setDeleteDialogOpen(false);
            toast({
                title: 'Fact deleted successfully',
                description: 'The fact has been removed.',
            });
        } else {
            toast({
                title: 'Failed to delete fact',
                description: 'An error occurred while deleting the fact.',
                variant: 'destructive',
            });
            setDeleteDialogOpen(false);
        }
    }, [DeleteFact, fact]);

    const handleEditClick = useCallback((e?: React.MouseEvent) => {
        // Prevent any form submission or event bubbling
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (fact) {
            const factId = fact.id || fact._id || '';
            // If already editing this fact, do nothing
            if (editingFactId === factId && isEditMode) {
                return;
            }

            // Reset form first to prevent conflicts
            const parsedValues = parseFactValues(fact);
            form.reset({
                name: fact.name || '',
                field_type: fact.field_type || '',
                value: parsedValues,
                icon: fact.icon || '',
            });
            setValuesTag(parsedValues);
            setSelectedIcon(fact.icon || null);

            setEditingFactId(factId);
            setIsEditMode(true);
            isInitializingRef.current = false;

            // Refetch to get latest data
            if (factId) {
                refetch();
            }
        }
    }, [fact, editingFactId, isEditMode, form, parseFactValues, refetch]);

    const handleCancelClick = useCallback(() => {
        setEditingFactId(null);
        setIsEditMode(false);
        isInitializingRef.current = false;

        // Reset to original values
        if (fact) {
            const parsedValues = parseFactValues(fact);
            form.reset({
                name: fact.name || '',
                field_type: fact.field_type || '',
                value: parsedValues,
                icon: fact.icon || '',
            });
            setValuesTag(parsedValues);
            setSelectedIcon(fact.icon || null);
        } else {
            form.reset();
            setValuesTag([]);
            setSelectedIcon(null);
        }
    }, [fact, form, parseFactValues]);

    const handleIconSelect = useCallback((iconName: string) => {
        setSelectedIcon(iconName);
        setIsOpen(false);
    }, []);

    return {
        // State
        isEditMode,
        deleteDialogOpen,
        setDeleteDialogOpen,
        valuesTag,
        setValuesTag,
        selectedIcon,
        isOpen,
        setIsOpen,

        // Form
        form,
        fieldType,

        // Data - only return error when query is enabled
        factSingle,
        isLoading: isEditMode && isLoading,
        isError: isEditMode && isError,

        // Mutations
        updateFactMutation,

        // Handlers
        handleUpdateFact,
        handleDeleteFact,
        confirmDeleteFact,
        handleEditClick,
        handleCancelClick,
        handleIconSelect,
    };
};
