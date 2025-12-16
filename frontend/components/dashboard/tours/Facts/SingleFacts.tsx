import React, { memo, useCallback, useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { getSingleFacts, updateFacts } from "@/lib/api/factsApi";
import Icon from "@/components/Icon";
import { InputTags } from "@/components/ui/InputTags";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import AllIcons from "./AllIcons";
import { Edit, FileText, Save, Tag, TagsIcon, Trash2, Type, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/hooks/useAuth";

interface FactDataWithId {
    name: string;
    title?: string;
    field_type?: string;
    label: string;
    icon?: string;
    id?: string;
    _id?: string;
    value: string[] | string | { label: string; value: string }[];
}

interface SingleFactProps {
    fact?: FactDataWithId;
    DeleteFact?: (id: string) => void;
}

interface FactApiResponse {
    facts?: FactDataWithId;
    [key: string]: unknown;
}

const SingleFact = memo(({
    fact,
    DeleteFact,
}: SingleFactProps) => {
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [valuesTag, setValuesTag] = useState<string[]>([]);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

    const setupFormFromFact = useCallback((factData: FactDataWithId) => {
        form.setValue('name', factData.name);
        form.setValue('field_type', factData.field_type || '');
        form.setValue('icon', factData.icon || '');

        let parsedValues: string[] = [];

        if (Array.isArray(factData.value)) {
            parsedValues = factData.value.map(item => {
                if (typeof item === 'string') {
                    return item;
                } else if (typeof item === 'object' && item !== null && 'value' in item) {
                    return item.value;
                }
                return '';
            });
        } else if (typeof factData.value === 'string') {
            try {
                const parsed = JSON.parse(factData.value);
                if (Array.isArray(parsed)) {
                    parsedValues = parsed.map(item => {
                        if (typeof item === 'string') {
                            return item;
                        } else if (typeof item === 'object' && item !== null && 'value' in item) {
                            return item.value;
                        }
                        return '';
                    });
                }
            } catch (e) {
                // Silent error
            }
        }

        form.setValue('value', parsedValues);
        setValuesTag(parsedValues);
        setSelectedIcon(factData.icon || null);
    }, [form]);

    useEffect(() => {
        if (fact && !isEditMode) {
            setSelectedIcon(fact.icon || null);
        }
    }, [fact, isEditMode]);

    const { data: factSingle, isLoading, isError, refetch } = useQuery<FactApiResponse>({
        queryKey: ['singleFact', fact?.id || fact?._id],
        queryFn: () => {
            const factId = fact?.id || fact?._id;
            if (factId) {
                return getSingleFacts(factId);
            }
            return Promise.reject('No fact ID provided');
        },
        enabled: !!(fact?.id || fact?._id),
        staleTime: 0,
    });

    useEffect(() => {
        if (factSingle && isEditMode) {
            const factData = factSingle.facts || factSingle;
            setupFormFromFact(factData as FactDataWithId);
        }
    }, [factSingle, isEditMode, setupFormFromFact]);

    const enterEditMode = useCallback(() => {
        if (fact) {
            refetch().then(() => {
                const factData = factSingle?.facts || factSingle || fact;
                setupFormFromFact(factData as FactDataWithId);
                setIsEditMode(true);
            });
        }
    }, [fact, setupFormFromFact, factSingle, refetch]);

    const updateFactMutation = useMutation({
        mutationFn: (factData: FormData) => updateFacts(factData, fact?.id || fact?._id || ''),
        onSuccess: () => {
            toast({
                title: 'Fact updated successfully',
                description: 'Your changes have been saved.',
                variant: 'default',
            });
            setIsEditMode(false);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['facts'] });
            queryClient.invalidateQueries({ queryKey: ['Facts'] });
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['Facts', userId] });
            }
            queryClient.invalidateQueries({ queryKey: ['tours'] });
        },
        onError: (e) => {
            toast({
                title: 'Failed to update fact',
                description: 'An error occurred while saving changes.',
                variant: 'destructive',
            });
            console.error("Error on facts update", e);
        },
    });

    const handleUpdateFact = useCallback(async () => {
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
                    const itemValue = typeof item === 'object' && item !== null && 'value' in item ? (item as any).value : String(item);
                    formData.append(`value[${index}]`, itemValue);
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
        if (DeleteFact && (fact?.id || fact?._id)) {
            DeleteFact(fact.id || fact._id as string);
            setDeleteDialogOpen(false);
            toast({
                title: "Fact deleted",
                description: "The fact has been deleted successfully."
            });
        } else {
            toast({
                title: "Error",
                description: "Could not delete the fact. Please try again.",
                variant: "destructive"
            });
            setDeleteDialogOpen(false);
        }
    }, [DeleteFact, fact]);

    const handleEditClick = useCallback(() => {
        enterEditMode();
    }, [enterEditMode]);

    const handleCancelClick = useCallback(() => {
        setIsEditMode(false);
        form.reset({
            name: fact?.name || '',
            field_type: fact?.field_type || '',
            value: Array.isArray(fact?.value) ? fact.value : [],
            icon: fact?.icon || '',
        });

        if (fact) {
            let parsedValues: string[] = [];

            if (Array.isArray(fact.value)) {
                parsedValues = fact.value.map(item => {
                    if (typeof item === 'string') {
                        return item;
                    } else if (typeof item === 'object' && item !== null && 'value' in item) {
                        return item.value;
                    }
                    return '';
                });
            } else if (typeof fact.value === 'string') {
                try {
                    const parsed = JSON.parse(fact.value);
                    if (Array.isArray(parsed)) {
                        parsedValues = parsed.map(item => {
                            if (typeof item === 'string') {
                                return item;
                            } else if (typeof item === 'object' && item !== null && 'value' in item) {
                                return item.value;
                            }
                            return '';
                        });
                    }
                } catch (e) {
                    // Silent error
                }
            }

            setValuesTag(parsedValues);
            setSelectedIcon(fact.icon || null);
        }
    }, [fact, form]);

    const handleIconSelect = useCallback((iconName: string) => {
        setSelectedIcon(iconName);
        setIsOpen(false);
    }, []);

    const loadingComponent = useMemo(() => (
        <Card className="shadow-xs animate-pulse">
            <CardContent className="p-6 space-y-4">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-20 bg-muted rounded w-full"></div>
            </CardContent>
        </Card>
    ), []);

    const errorComponent = useMemo(() => (
        <Card className="shadow-xs border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
                <p className="text-destructive">Error loading fact details. Please try again later.</p>
            </CardContent>
        </Card>
    ), []);

    if (isLoading) return loadingComponent;
    if (isError) return errorComponent;

    return (
        <Form {...form}>
            <form onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleUpdateFact)();
            }}>
                <Card className={cn(
                    "shadow-xs overflow-hidden py-0 transition-all",
                    isEditMode ? "border-primary/30 bg-primary/5" : "hover:border-border/80"
                )}>
                    <CardContent className="p-0">
                        {isEditMode ? (
                            <div className="p-5 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-primary/10 text-primary">Editing</Badge>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 text-primary" />
                                                Fact Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Enter fact name"
                                                    className="focus-visible:ring-primary"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="field_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1.5">
                                                <Type className="h-3.5 w-3.5 text-primary" />
                                                Fact Type
                                            </FormLabel>
                                            <Select onValueChange={(value) => {
                                                if ((value === 'Single Select' || value === 'Multi Select') &&
                                                    (field.value !== 'Single Select' && field.value !== 'Multi Select')) {
                                                    setValuesTag([]);
                                                    form.setValue('value', []);
                                                }
                                                field.onChange(value);
                                            }} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="focus-visible:ring-primary">
                                                        <SelectValue placeholder="Select type for fact value" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Plain Text">Plain Text</SelectItem>
                                                    <SelectItem value="Single Select">Single Select</SelectItem>
                                                    <SelectItem value="Multi Select">Multi Select</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                This determines how the fact value will be displayed
                                            </p>
                                        </FormItem>
                                    )}
                                />
                                {(fieldType === 'Single Select' || fieldType === 'Multi Select') && (
                                    <FormField
                                        control={form.control}
                                        name="value"
                                        render={({ field }) => {
                                            return (
                                                <FormItem>
                                                    <FormLabel className="flex items-center gap-1.5">
                                                        <TagsIcon className="h-3.5 w-3.5 text-primary" />
                                                        {fieldType === 'Single Select' ? 'Options' : 'Multiple Options'}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <InputTags
                                                            value={valuesTag}
                                                            placeholder={fieldType === 'Single Select' ?
                                                                "Enter options (press Enter after each)" :
                                                                "Enter multiple options (press Enter after each)"}
                                                            onChange={(newTags: string[]) => {
                                                                setValuesTag(newTags);
                                                                field.onChange(newTags);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {fieldType === 'Single Select'
                                                            ? 'These are the options users can select from (exactly one)'
                                                            : 'These are the options users can select from (multiple allowed)'}
                                                    </p>
                                                </FormItem>
                                            );
                                        }}
                                    />
                                )}
                                <FormField
                                    control={form.control}
                                    name="icon"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1.5">
                                                {selectedIcon ? (
                                                    <Icon name={selectedIcon} size={14} />
                                                ) : (
                                                    <Tag className="h-3.5 w-3.5 text-primary" />
                                                )}
                                                Icon
                                            </FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-3">
                                                    {selectedIcon && (
                                                        <div className="flex items-center justify-center h-10 w-10 bg-secondary/50 rounded-md">
                                                            <Icon name={selectedIcon} size={24} />
                                                        </div>
                                                    )}
                                                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                                        <Button
                                                            variant="outline"
                                                            className="ml-2"
                                                            onClick={() => setIsOpen(true)}
                                                            type="button"
                                                        >
                                                            Select Icon
                                                        </Button>
                                                        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>Select an Icon</DialogTitle>
                                                                <DialogDescription>
                                                                    Choose an icon for this fact
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <AllIcons onSelectIcon={handleIconSelect} />
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ) : (
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    {fact?.icon ? (
                                        <div className="shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                            <Icon name={fact.icon} size={20} />
                                        </div>
                                    ) : (
                                        <FileText className="h-5 w-5 text-primary" />
                                    )}
                                    <h3 className="font-semibold text-base">
                                        {fact?.name}
                                    </h3>
                                </div>
                                <Separator className="my-3" />
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Type className="h-4 w-4" />
                                        <span className="font-medium">Type:</span>
                                        <Badge variant="secondary">{fact?.field_type}</Badge>
                                    </div>
                                    {fact?.value && Array.isArray(fact.value) && fact.value.length > 0 && (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                                                <TagsIcon className="h-4 w-4" />
                                                <span className="font-medium">
                                                    {fact.field_type === 'Single Select' ? 'Options:' : 'Multiple Options:'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {fact.value.map((item, index) => {
                                                    const tagValue = typeof item === 'object' && item !== null
                                                        ? item.label || item.value
                                                        : String(item);

                                                    return (
                                                        <Badge key={index} variant="secondary" className="mr-1 mb-1">
                                                            {tagValue}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
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
                                    disabled={updateFactMutation.isPending}
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
                                    onClick={handleEditClick}
                                    className="text-muted-foreground hover:text-primary gap-1.5"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                    Edit
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteFact()}
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
                            Are you sure you want to delete this fact? This action cannot be undone.
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
                            onClick={confirmDeleteFact}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Form>
    );
});

SingleFact.displayName = 'SingleFact';

export default SingleFact;
