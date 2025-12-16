'use client';

import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useTourContext } from '@/providers/TourProvider';
import { getUserFacts } from '@/lib/api/factsApi';
import { FactData } from '@/lib/types';
import Icon from '@/components/Icon';
import { getUserId } from '@/lib/utils/auth';

/**
 * TourFacts Component
 * Manages tour facts with field arrays from TourProvider
 * Supports Plain Text, Single Select, and Multi Select field types
 */

export function TourFacts() {
    const { register, setValue, watch, formState: { errors }, control } = useFormContext();
    const { factsFields, appendFacts, factsRemove, form } = useTourContext();

    // State to keep track of selected facts for each row
    const [selectedFact, setSelectedFact] = useState<Record<number, FactData | undefined>>({});

    const watchedFacts = form.watch('facts');
    const userId = getUserId();

    // Fetch user's facts
    const { data: facts, refetch: refetchFacts, isLoading: isLoadingFacts } = useQuery({
        queryKey: ['facts', userId],
        queryFn: () => getUserFacts(userId!),
        enabled: !!userId,
    });

    // Refetch facts when component mounts or when facts might have been updated
    useEffect(() => {
        refetchFacts();
    }, [refetchFacts]);

    // Initialize selectedFact from watchedFacts using factId
    useEffect(() => {
        if (!Array.isArray(watchedFacts) || !Array.isArray(facts) || facts.length === 0) return;

        const initialSelectedFacts: Record<number, FactData | undefined> = {};

        watchedFacts.forEach((watchedFact: any, idx: number) => {
            if (watchedFact?.factId) {
                const masterFact = facts.find((f: any) => (f._id || f.id) === watchedFact.factId);
                if (masterFact) {
                    initialSelectedFacts[idx] = masterFact;
                }
            }
        });

        if (Object.keys(initialSelectedFacts).length > 0) {
            setSelectedFact(initialSelectedFacts);
        }
    }, [watchedFacts, facts]);

    const handleFactSelect = (fact: FactData | undefined, index: number) => {
        console.log('🎯 handleFactSelect called:', { fact, index });
        if (fact) {
            const factId = fact.id;
            if (!factId) {
                console.error('❌ Fact must have an ID!', fact);
                return;
            }

            setSelectedFact({ ...selectedFact, [index]: fact });

            // Store fact reference and metadata
            setValue(`facts.${index}.factId`, factId);
            setValue(`facts.${index}.title`, fact.name || fact.title);
            setValue(`facts.${index}.field_type`, fact.field_type || 'Plain Text');
            setValue(`facts.${index}.icon`, fact.icon || '');

            console.log('✅ After setValue, checking form values:', {
                factId: watch(`facts.${index}.factId`),
                title: watch(`facts.${index}.title`),
                field_type: watch(`facts.${index}.field_type`),
                icon: watch(`facts.${index}.icon`),
                fullFact: watch(`facts.${index}`)
            });
        }
    };

    // Sync form when master facts change
    useEffect(() => {
        if (!Array.isArray(watchedFacts) || !Array.isArray(facts) || facts.length === 0) return;

        watchedFacts.forEach((watchedFact, index) => {
            if (!watchedFact?.factId) return;

            const masterFact = facts.find((f: any) => (f._id || f.id) === watchedFact.factId);
            if (!masterFact) return;

            const hasChanges =
                masterFact.icon !== watchedFact.icon ||
                masterFact.field_type !== watchedFact.field_type ||
                (masterFact.name || masterFact.title) !== watchedFact.title;

            if (hasChanges) {
                setValue(`facts.${index}.title`, masterFact.name || masterFact.title);
                setValue(`facts.${index}.field_type`, masterFact.field_type || 'Plain Text');
                setValue(`facts.${index}.icon`, masterFact.icon || '');

                setSelectedFact(prev => ({
                    ...prev,
                    [index]: masterFact
                }));
            }
        });
    }, [facts, watchedFacts, setValue]);

    return (
        <Card className="shadow-xs pt-0">
            <CardHeader className="bg-secondary border-b pb-6 pt-4 br-4 rounded-md">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl font-semibold">Tour Facts</CardTitle>
                </div>
                <CardDescription>
                    Add important details and specifications about the tour
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-md font-medium">Facts & Specifications</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => {
                            appendFacts?.({
                                title: '',
                                value: '',
                                field_type: 'Plain Text',
                                icon: ''
                            });
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Fact</span>
                    </Button>
                </div>

                {/* Show facts if we have factsFields */}
                {(Array.isArray(factsFields) && factsFields.length > 0) ? (
                    <div className="space-y-4">
                        {/* Use factsFields for mapping to ensure sync with form array */}
                        {factsFields.map((_field, index) => {
                            // Check if the fact has actual content - check for factId, title, field_type, or value
                            const currentFact = Array.isArray(watchedFacts) ? watchedFacts[index] : null;

                            console.log(`📋 watchedFacts state:`, {
                                isArray: Array.isArray(watchedFacts),
                                length: watchedFacts?.length,
                                watchedFacts: watchedFacts,
                                currentFactAtIndex: currentFact
                            });
                            const hasFact = currentFact && (
                                currentFact.factId ||  // Check if a fact has been selected
                                currentFact.title ||
                                currentFact.field_type ||
                                (currentFact.value && (
                                    (Array.isArray(currentFact.value) && currentFact.value.length > 0) ||
                                    (typeof currentFact.value === 'string' && currentFact.value.trim() !== '')
                                ))
                            );

                            // DEBUG LOGGING FOR ACCORDION
                            console.log(`🔍 Fact ${index} - Accordion Debug:`, {
                                index,
                                hasFact: !!hasFact, // Convert to boolean
                                hasFactRaw: hasFact, // Show raw value
                                currentFact: currentFact ? JSON.parse(JSON.stringify(currentFact)) : null, // Deep clone for inspection
                                factId: currentFact?.factId,
                                title: currentFact?.title,
                                field_type: currentFact?.field_type,
                                value: currentFact?.value,
                                shouldShowAccordion: hasFact ? 'YES' : 'NO',
                                accordionWillRender: !!hasFact
                            });

                            return (
                                <Card key={`fact-card-${index}`} className={cn(
                                    "border overflow-hidden p-0 transition-all",
                                    hasFact ? "border-border" : "bg-secondary/50"
                                )}>
                                    {/* Only show accordion if field has been initialized OR the user wants to create a new fact */}
                                    {hasFact ? (
                                        <Accordion type="single" collapsible className="w-full" defaultValue={`item-${index}`}>
                                            <AccordionItem value={`item-${index}`} className="border-none">
                                                <AccordionTrigger className="p-0 hover:no-underline hover:bg-secondary/70 p-4">
                                                    <div className="flex items-center space-x-3 w-full">
                                                        <Badge variant="default"
                                                            className="rounded-md h-7 w-7 p-0 flex items-center justify-center font-medium">
                                                            <div className="shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                                <Icon name={(() => {
                                                                    if (!currentFact?.factId) return currentFact.icon || '';
                                                                    const masterFact = facts?.find((fact: FactData) => (fact.id) === currentFact.factId);
                                                                    return masterFact?.icon || currentFact.icon || '';
                                                                })()} size={20} />
                                                            </div>
                                                        </Badge>
                                                        <div className="flex-1 font-medium text-base">
                                                            {(() => {
                                                                if (!currentFact?.factId) return `Fact ${index + 1}`;

                                                                const masterFact = facts?.find(
                                                                    (fact: FactData) => (fact.id) === currentFact.factId
                                                                );

                                                                return (
                                                                    masterFact?.name ||
                                                                    currentFact.title ||
                                                                    `Fact ${index + 1}`
                                                                );
                                                            })()}
                                                        </div>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Update selectedFact by removing the entry for this index
                                                                setSelectedFact(prev => {
                                                                    const updated = { ...prev };
                                                                    delete updated[index];
                                                                    return updated;
                                                                });
                                                                factsRemove?.(index);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.stopPropagation();
                                                                    // Update selectedFact by removing the entry for this index
                                                                    setSelectedFact(prev => {
                                                                        const updated = { ...prev };
                                                                        delete updated[index];
                                                                        return updated;
                                                                    });
                                                                    factsRemove?.(index);
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
                                                            control={form.control}
                                                            name={`facts.${index}.title`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Fact Name</FormLabel>
                                                                    <FormControl>
                                                                        <Select
                                                                            value={watchedFacts?.[index]?.factId || undefined}
                                                                            onValueChange={(value) => {
                                                                                const foundFact = facts?.find((fact: FactData) => (fact.id) === value);
                                                                                if (foundFact) {
                                                                                    handleFactSelect(foundFact, index);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <SelectTrigger className="w-full">
                                                                                <SelectValue placeholder="Select a fact" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {Array.isArray(facts) && facts.length > 0 ? facts.map((fact) => (
                                                                                    <SelectItem
                                                                                        key={`fact-${fact._id || fact.id || 'unknown'}`}
                                                                                        value={fact._id || fact.id || `fact-${fact.name}-${Date.now()}`}
                                                                                    >
                                                                                        {fact.name}
                                                                                    </SelectItem>
                                                                                )) : (
                                                                                    <SelectItem value="no-facts" disabled>No facts available</SelectItem>
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`facts.${index}.field_type`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Field Type</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            disabled
                                                                            placeholder="Field type is set automatically"
                                                                            className="bg-secondary/30"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />


                                                        {selectedFact && Array.isArray(watchedFacts) && watchedFacts[index]?.field_type === 'Plain Text' && (
                                                            <FormField
                                                                control={form.control}
                                                                name={`facts.${index}.value`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Fact Details</FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                value={
                                                                                    Array.isArray(field.value) && field.value.length > 0
                                                                                        ? (typeof field.value[0] === 'string' ? field.value[0] : '')
                                                                                        : typeof field.value === 'string' ? field.value : ''
                                                                                }
                                                                                onChange={(e) => {
                                                                                    // Allow both string and array formats for backward compatibility
                                                                                    field.onChange(e.target.value);
                                                                                }}
                                                                                placeholder={`Enter ${selectedFact[index]?.name || 'Fact Details'}`}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        )}

                                                        {Array.isArray(watchedFacts) && watchedFacts[index]?.field_type === 'Single Select' && selectedFact[index] && (
                                                            <FormField
                                                                control={form.control}
                                                                name={`facts.${index}.value`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Fact Details</FormLabel>
                                                                        <FormControl>
                                                                            <Select
                                                                                value={Array.isArray(field.value) && field.value.length > 0 ?
                                                                                    (typeof field.value[0] === 'string'
                                                                                        ? field.value[0]
                                                                                        : (field.value[0] && typeof field.value[0] === 'object' && 'value' in field.value[0]
                                                                                            ? field.value[0].value
                                                                                            : ''))
                                                                                    : ''}
                                                                                onValueChange={(value) => {
                                                                                    // Store as array with single item
                                                                                    field.onChange([value]);

                                                                                }}


                                                                            >
                                                                                <SelectTrigger className="w-full">
                                                                                    <SelectValue placeholder="Select an option" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {Array.isArray(selectedFact[index]?.value) &&
                                                                                        selectedFact[index]?.value.map((option, idx: number) => {
                                                                                            // Handle both string and object types
                                                                                            const optionValue = typeof option === 'string'
                                                                                                ? option
                                                                                                : option.value;
                                                                                            const optionLabel = typeof option === 'string'
                                                                                                ? option
                                                                                                : option.label;

                                                                                            return (
                                                                                                <SelectItem key={idx} value={String(optionValue)}>
                                                                                                    {String(optionLabel)}
                                                                                                </SelectItem>
                                                                                            );
                                                                                        })}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        )}

                                                        {Array.isArray(watchedFacts) && watchedFacts[index]?.field_type === 'Multi Select' && selectedFact[index] && (
                                                            <FormField
                                                                control={form.control}
                                                                name={`facts.${index}.value`}
                                                                render={({ field }) => {
                                                                    // Extract current field value and handle nested arrays
                                                                    let fieldValue: Array<string | { label: string; value: string }> = [];

                                                                    // Debug the exact structure of the value

                                                                    if (Array.isArray(field.value)) {
                                                                        if (field.value.length > 0) {
                                                                            if (typeof field.value[0] === 'object' && !Array.isArray(field.value[0])) {
                                                                                // It's an array of objects
                                                                                fieldValue = field.value as Array<{ label: string; value: string }>;
                                                                            } else if (Array.isArray(field.value[0])) {
                                                                                // It's a nested array, extract the inner array
                                                                                fieldValue = field.value[0];
                                                                            } else if (field.value.every(item => typeof item === 'string')) {
                                                                                // It's a flat array of strings (from API)
                                                                                fieldValue = field.value;
                                                                            }
                                                                        }
                                                                    } else if (typeof field.value === 'string' && field.value) {
                                                                        // Handle case where it might be a JSON string
                                                                        try {
                                                                            const parsed = JSON.parse(field.value);
                                                                            if (Array.isArray(parsed)) {
                                                                                fieldValue = parsed;
                                                                            }
                                                                        } catch (e) {
                                                                            // Not valid JSON, use as single string value
                                                                            fieldValue = [field.value];
                                                                        }
                                                                    }
                                                                    // Map our string array to object format needed by MultiSelect
                                                                    const optionsMulti = Array.isArray(selectedFact[index]?.value)
                                                                        ? selectedFact[index]?.value.map((option: string | { label: string; value: string }) => {
                                                                            if (typeof option === 'string') {
                                                                                return {
                                                                                    value: option,
                                                                                    label: option,
                                                                                };
                                                                            }
                                                                            // If it's already an object with label/value, return it as is
                                                                            return option;
                                                                        })
                                                                        : [];

                                                                    // Format current values to match MultiSelect expected format

                                                                    const currentValues = (Array.isArray(fieldValue) ?
                                                                        fieldValue.map(val => {
                                                                            // Handle different possible formats
                                                                            if (typeof val === 'string') {
                                                                                return { value: val, label: val };
                                                                            } else if (val && typeof val === 'object' && 'value' in val) {
                                                                                return val;
                                                                            } else if (val && typeof val === 'object' && 'label' in val) {
                                                                                return val;
                                                                            }
                                                                            return null;
                                                                        }).filter(Boolean) : []) as { label: string; value: string }[];


                                                                    return (
                                                                        <FormItem>
                                                                            <FormLabel>Fact Details</FormLabel>
                                                                            <FormControl>
                                                                                <MultiSelect
                                                                                    options={optionsMulti}
                                                                                    value={currentValues}
                                                                                    onValueChange={(selectedValues) => {
                                                                                        // Extract just the string values from the selected objects
                                                                                        const stringValues = selectedValues.map(item => {
                                                                                            return typeof item === 'object' && item !== null && 'value' in item
                                                                                                ? String(item.value)
                                                                                                : String(item);
                                                                                        });
                                                                                        // Store as a flat array of strings, not objects
                                                                                        field.onChange(stringValues);
                                                                                    }}
                                                                                    placeholder="Select options"
                                                                                    className="w-full"
                                                                                    maxDisplayValues={10}
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    );
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    ) : (
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Badge variant="outline"
                                                    className="rounded-md h-7 w-7 p-0 flex items-center justify-center font-medium">
                                                    <FileText className="h-4 w-4" />
                                                </Badge>
                                                <div className="flex-1 font-medium text-base text-muted-foreground">
                                                    New Fact
                                                </div>
                                            </div>

                                            <div className="flex space-x-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`facts.${index}.title`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-full">
                                                            <FormControl>
                                                                <Select
                                                                    value={watchedFacts?.[index]?.factId || undefined}
                                                                    onValueChange={(value) => {
                                                                        const foundFact = facts?.find((fact: FactData) => (fact.id) === value);
                                                                        if (foundFact) {
                                                                            handleFactSelect(foundFact, index);
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="w-[220px]">
                                                                        <SelectValue placeholder="Select a fact" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {Array.isArray(facts) && facts.length > 0 ? facts.map((fact) => (
                                                                            <SelectItem
                                                                                key={`fact-${fact._id || fact.id || fact.name}`}
                                                                                value={fact._id || fact.id || `fact-${fact.name}`}
                                                                            >
                                                                                {fact.name}
                                                                            </SelectItem>
                                                                        )) : (
                                                                            <SelectItem disabled value="no-facts">No facts available</SelectItem>
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
                                                        factsRemove?.(index);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.stopPropagation();
                                                            factsRemove?.(index);
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
                        <h3 className="font-medium text-lg mb-1">No Facts added yet</h3>
                        <p className="text-muted-foreground mb-5 max-w-md">Add important details about your tour such as duration, group size, accommodations, etc.</p>
                        <Button
                            type="button"
                            onClick={() => {
                                appendFacts?.({
                                    title: '',
                                    value: '',
                                    field_type: 'Plain Text' as 'Plain Text' | 'Single Select' | 'Multi Select',
                                    icon: ''
                                });
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            <span>Add First Fact</span>
                        </Button>
                    </div>
                )}

                <div className="flex items-center justify-between mt-6">
                    <h3 className="text-md font-medium">Add New Fact</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => {
                            appendFacts?.({
                                title: '',
                                value: '',
                                field_type: 'Plain Text',
                                icon: ''
                            });
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Fact</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
