'use client';

import { useMemo, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFacts } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2, FileText, HelpCircle, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useTourContext } from '@/providers/TourProvider';
import { getUserFacts } from '@/lib/api/factsApi';
import type { FactData } from '@/types/facts';
import type { EditorFact, FactValue } from '@/types/tourEditor';
import Icon from '@/components/Icon';
import { getUserId } from '@/lib/utils/auth';
import AddFact from './Facts/AddFacts';

export function TourFacts() {
    const { factsFields, appendFacts, factsRemove, factsMove, form } = useTourContext();
    const { control, setValue, watch } = form;
    const queryClient = useQueryClient();

    const facts = watch('facts');
    const userId = getUserId();

    const [isAddFactDialogOpen, setIsAddFactDialogOpen] = useState(false);
    const [currentFactIndex, setCurrentFactIndex] = useState<number | null>(null);
    const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});

    const { data: masterFacts } = useFacts(userId, !!userId);
    const masterFactsData = masterFacts?.data || [];

    const hasManuallyAddedFacts = useMemo(() => {
        return Array.isArray(factsFields) && factsFields.length > 0;
    }, [factsFields]);

    const handleAddFact = () => {
        appendFacts({
            name: '',
            value: [],
            field_type: 'Plain Text',
            icon: ''
        });
    };

    const handleAddFirstFact = () => {
        const index = Array.isArray(factsFields) ? factsFields.length : 0;
        handleAddFact();
        setCurrentFactIndex(index);
        setIsAddFactDialogOpen(true);
    };

    const handleFactSelect = (factData: FactData | undefined, index: number) => {
        if (factData) {
            setValue(`facts.${index}.factId`, factData.id, { shouldDirty: true, shouldValidate: false });
            setValue(`facts.${index}.name`, factData.name, { shouldDirty: true, shouldValidate: false });
            setValue(`facts.${index}.field_type`, factData.field_type || 'Plain Text', { shouldDirty: true, shouldValidate: false });
            setValue(`facts.${index}.icon`, factData.icon, { shouldDirty: true, shouldValidate: false });
            setValue(`facts.${index}.value`, [], { shouldDirty: true, shouldValidate: false });
            setOpenPopovers(prev => ({ ...prev, [index]: false }));
        }
    };

    const setPopoverOpen = (index: number, open: boolean) => {
        setOpenPopovers(prev => ({ ...prev, [index]: open }));
    };

    const handleFactAdded = async () => {
        if (userId) {
            await queryClient.invalidateQueries({ queryKey: ['facts', userId] });
            const updatedFacts = await queryClient.fetchQuery({
                queryKey: ['facts', userId],
                queryFn: () => getUserFacts(userId!),
            });

            if (currentFactIndex !== null && updatedFacts && Array.isArray(updatedFacts) && updatedFacts.length > 0) {
                const newFact = updatedFacts[updatedFacts.length - 1];
                if (newFact) {
                    handleFactSelect(newFact, currentFactIndex);
                }
            }
            setCurrentFactIndex(null);
        }
        setIsAddFactDialogOpen(false);
    };

    // Sync form when master facts change
    useEffect(() => {
        if (
            Array.isArray(factsFields) && factsFields.length > 0 &&
            Array.isArray(masterFactsData) && masterFactsData.length > 0
        ) {
            factsFields.forEach((field, index: number) => {
                // Access fields from useFieldArray - they have optional properties
                const fieldId = 'factId' in field ? field.factId : ('id' in field ? field.id : undefined);
                const fieldName = 'name' in field ? field.name : undefined;

                if (fieldId) {
                    const matchedFact = masterFactsData.find((f: FactData) => f.id === fieldId);
                    if (matchedFact) {
                        setValue(`facts.${index}.factId`, matchedFact.id, { shouldDirty: false });
                        setValue(`facts.${index}.name`, matchedFact.name, { shouldDirty: false });
                        setValue(`facts.${index}.field_type`, matchedFact.field_type, { shouldDirty: false });
                        setValue(`facts.${index}.icon`, matchedFact.icon, { shouldDirty: false });
                    }
                } else if (fieldName) {
                    const matchedFact = masterFactsData.find((f: FactData) =>
                        f.name === fieldName || f.name?.trim() === fieldName?.trim()
                    );
                    if (matchedFact) {
                        setValue(`facts.${index}.factId`, matchedFact.id, { shouldDirty: false });
                        setValue(`facts.${index}.name`, matchedFact.name, { shouldDirty: false });
                        setValue(`facts.${index}.field_type`, matchedFact.field_type, { shouldDirty: false });
                        setValue(`facts.${index}.icon`, matchedFact.icon, { shouldDirty: false });
                    }
                }
            });
        }
    }, [factsFields, masterFactsData, setValue]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
        if (dragIndex !== dropIndex) {
            factsMove(dragIndex, dropIndex);
        }
    };

    // ✅ HELPER: Get master fact options
    const getMasterFactOptions = (factId?: string): string[] => {
        if (!factId || !masterFactsData) return [];
        const masterFact = Array.isArray(masterFactsData) ? masterFactsData.find((f: FactData) => f.id === factId) : undefined;
        const values = masterFact?.value;
        if (!values) return [];
        return (Array.isArray(values) ? values : [values])
            .map((v) => (typeof v === 'object' ? v.value : v))
            .filter(Boolean);
    };

    // ✅ HELPER: Render value input based on field type
    /** A plain-text / single-select fact's value: stored as a string, or as a one-item list. */
    const factText = (value: FactValue | undefined): string => {
        const first = Array.isArray(value) ? value[0] : value;
        return typeof first === 'object' && first !== null ? first.value ?? first.label ?? '' : first ?? '';
    };

    const renderValueInput = (index: number, currentFact: EditorFact) => {
        if (!currentFact?.field_type) return null;

        const fieldType = currentFact.field_type;
        const masterOptions = getMasterFactOptions(currentFact.factId);

        // Plain Text - Single input
        if (fieldType === 'Plain Text') {
            return (
                <FormField
                    control={control}
                    name={`facts.${index}.value`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fact Details</FormLabel>
                            <FormControl>
                                <Input
                                    value={factText(field.value)}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder={`Enter ${currentFact.name || 'fact details'}`}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        }

        // Single Select - Popover with single choice
        if (fieldType === 'Single Select') {
            return (
                <FormField
                    control={control}
                    name={`facts.${index}.value`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fact Details</FormLabel>
                            <FormControl>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                        >
                                            <span className={cn(
                                                "truncate",
                                                !factText(field.value) && "text-muted-foreground"
                                            )}>
                                                {factText(field.value) || "Select an option"}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search options..." />
                                            <CommandList>
                                                <CommandEmpty>No options found.</CommandEmpty>
                                                <CommandGroup>
                                                    {masterOptions.map((option, idx) => (
                                                        <CommandItem
                                                            key={idx}
                                                            value={option}
                                                            onSelect={() => field.onChange([option])}
                                                            className="cursor-pointer"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    field.value?.[0] === option ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {option}
                                                        </CommandItem>
                                                    ))}
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
            );
        }

        // Multi Select - MultiSelect component
        if (fieldType === 'Multi Select') {
            return (
                <FormField
                    control={control}
                    name={`facts.${index}.value`}
                    render={({ field }) => {
                        const options = masterOptions.map(opt => ({ value: opt, label: opt }));
                        // Saved values are plain strings or { label, value } pairs.
                        const currentValues: string[] = (Array.isArray(field.value) ? field.value : field.value ? [field.value] : [])
                            .map((val: string | { value?: string }) => (typeof val === 'object' ? val?.value ?? '' : val))
                            .filter(Boolean);

                        return (
                            <FormItem>
                                <FormLabel>Fact Details</FormLabel>
                                <FormControl>
                                    <MultiSelect
                                        options={options}
                                        defaultValue={currentValues}
                                        onValueChange={(selectedValues) => field.onChange(selectedValues)}
                                        placeholder="Select options"
                                        className="w-full"
                                        maxCount={10}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        );
                    }}
                />
            );
        }

        return null;
    };

    return (
        <Card className="shadow-xs pt-0">
            <CardHeader className="bg-secondary border-b pt-4 rounded-t-sm">
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
                        onClick={handleAddFact}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Fact</span>
                    </Button>
                </div>

                {hasManuallyAddedFacts ? (
                    <div className="space-y-4">
                        {factsFields.map((field, index) => {
                            const currentFact = facts?.[index];
                            const hasFact = currentFact?.name?.trim();

                            return (
                                <Card
                                    key={field.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className={cn(
                                        "border overflow-hidden transition-all cursor-move hover:shadow-md py-0",
                                        hasFact ? "border-border" : "bg-secondary/50"
                                    )}
                                >
                                    {hasFact ? (
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value={`item-${index}`} className="border-none">
                                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/70">
                                                    <div className="flex items-center space-x-3 w-full">
                                                        <Badge variant="default" className="rounded-md h-7 w-7 p-0 flex items-center justify-center">
                                                            <Icon name={currentFact?.icon || ''} size={16} />
                                                        </Badge>
                                                        <div className="flex-1 font-medium text-base truncate">
                                                            {currentFact?.name || `Fact ${index + 1}`}
                                                        </div>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                factsRemove(index);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.stopPropagation();
                                                                    factsRemove(index);
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
                                                        {/* Fact Name Selection */}
                                                        <FormField
                                                            control={control}
                                                            name={`facts.${index}.name`}
                                                            render={() => (
                                                                <FormItem>
                                                                    <FormLabel className="flex items-center gap-1">
                                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                                        <span>Fact Name</span>
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
                                                                                    className="w-full justify-between"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <span className={cn("truncate", !currentFact?.name && "text-muted-foreground")}>
                                                                                        {currentFact?.name || "Select a fact"}
                                                                                    </span>
                                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-full p-0" align="start">
                                                                                <Command>
                                                                                    <CommandInput placeholder="Search facts..." />
                                                                                    <CommandList>
                                                                                        <CommandEmpty>No facts found.</CommandEmpty>
                                                                                        <CommandGroup>
                                                                                            {Array.isArray(masterFactsData) && masterFactsData.map((factItem: FactData) => (
                                                                                                <CommandItem
                                                                                                    key={factItem.id}
                                                                                                    value={`${factItem.name} ${factItem.field_type || ''}`}
                                                                                                    onSelect={() => handleFactSelect(factItem, index)}
                                                                                                    className="cursor-pointer"
                                                                                                >
                                                                                                    <Check
                                                                                                        className={cn(
                                                                                                            "mr-2 h-4 w-4",
                                                                                                            currentFact?.factId === factItem.id ? "opacity-100" : "opacity-0"
                                                                                                        )}
                                                                                                    />
                                                                                                    {factItem.name}
                                                                                                </CommandItem>
                                                                                            ))}
                                                                                            <CommandItem
                                                                                                value="add-custom-fact"
                                                                                                onSelect={() => {
                                                                                                    setCurrentFactIndex(index);
                                                                                                    setIsAddFactDialogOpen(true);
                                                                                                    setPopoverOpen(index, false);
                                                                                                }}
                                                                                                className="text-primary font-medium cursor-pointer"
                                                                                            >
                                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                                    Add fact
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

                                                        {/* Field Type (Read-only) */}
                                                        <FormField
                                                            control={control}
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

                                                        {/* ✅ Dynamic Value Input */}
                                                        {renderValueInput(index, currentFact)}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    ) : (
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Badge variant="outline" className="rounded-md h-7 w-7 p-0 flex items-center justify-center">
                                                    <FileText className="h-4 w-4" />
                                                </Badge>
                                                <div className="flex-1 font-medium text-base text-muted-foreground">
                                                    New Fact
                                                </div>
                                            </div>

                                            <FormField
                                                control={control}
                                                name={`facts.${index}.factId`}
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
                                                                        className="w-full justify-between"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <span className={cn("truncate", !currentFact?.name && "text-muted-foreground")}>
                                                                            {currentFact?.name || "Select a fact"}
                                                                        </span>
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-full p-0" align="start">
                                                                    <Command>
                                                                        <CommandInput placeholder="Search facts..." />
                                                                        <CommandList>
                                                                            <CommandEmpty>No facts found.</CommandEmpty>
                                                                            <CommandGroup>
                                                                                {Array.isArray(masterFactsData) && masterFactsData.map((factItem: FactData) => (
                                                                                    <CommandItem
                                                                                        key={factItem.id}
                                                                                        value={`${factItem.name} ${factItem.field_type || ''}`}
                                                                                        onSelect={() => handleFactSelect(factItem, index)}
                                                                                        className="cursor-pointer"
                                                                                    >
                                                                                        <Check
                                                                                            className={cn(
                                                                                                "mr-2 h-4 w-4",
                                                                                                currentFact?.factId === factItem.id ? "opacity-100" : "opacity-0"
                                                                                            )}
                                                                                        />
                                                                                        {factItem.name}
                                                                                    </CommandItem>
                                                                                ))}
                                                                                <CommandItem
                                                                                    value="add-custom-fact"
                                                                                    onSelect={() => {
                                                                                        setCurrentFactIndex(index);
                                                                                        setIsAddFactDialogOpen(true);
                                                                                        setPopoverOpen(index, false);
                                                                                    }}
                                                                                    className="text-primary font-medium cursor-pointer"
                                                                                >
                                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                                    Add fact
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
                                                    factsRemove(index);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.stopPropagation();
                                                        factsRemove(index);
                                                    }
                                                }}
                                                className="h-10 w-10 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Remove</span>
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
                        <p className="text-muted-foreground mb-5 max-w-md">
                            Add important details about your tour such as duration, group size, accommodations, etc.
                        </p>
                        <Button type="button" onClick={handleAddFirstFact}>
                            <Plus className="h-4 w-4 mr-2" />
                            <span>Add fact</span>
                        </Button>
                    </div>
                )}
            </CardContent>

            <Dialog open={isAddFactDialogOpen} onOpenChange={setIsAddFactDialogOpen}>
                <DialogContent
                    className="max-w-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Add Custom Fact</DialogTitle>
                        <DialogDescription>
                            Create a new fact that will be added to your fact library and can be reused in other tours.
                        </DialogDescription>
                    </DialogHeader>
                    <div onClick={(e) => e.stopPropagation()}>
                        <AddFact onFactAdded={handleFactAdded} />
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}