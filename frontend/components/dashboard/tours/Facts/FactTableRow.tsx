import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { getSingleFacts, updateFacts } from "@/lib/api/factsApi";
import { FactData } from "./useFacts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Edit, Save, Trash2, X, Tag } from "lucide-react";
import { InputTags } from "@/components/ui/InputTags";
import Icon from "@/components/Icon";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import AllIcons from "./AllIcons";
import { getUserId } from "@/lib/auth/authUtils";
import { Checkbox } from "@/components/ui/checkbox";

interface FactTableRowProps {
    fact?: FactData;
    DeleteFact?: (id: string) => void;
    isSelected?: boolean;
    onSelectChange?: (id: string, checked: boolean) => void;
}

const FactTableRow = ({
    fact,
    DeleteFact,
    isSelected = false,
    onSelectChange,
}: FactTableRowProps) => {
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [valuesTag, setValuesTag] = useState<string[]>([]);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const userId = getUserId();
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

    const { data: factSingle, refetch } = useQuery({
        queryKey: ['singleFact', fact?.id || fact?._id],
        queryFn: () => {
            const factId = fact?.id || fact?._id;
            if (factId) {
                return getSingleFacts(factId);
            }
            return Promise.reject('No fact ID provided');
        },
        enabled: false,
    });

    const updateFactMutation = useMutation({
        mutationFn: (factData: FormData) => updateFacts(factData, fact?.id || fact?._id || ''),
        onSuccess: () => {
            toast({
                title: 'Fact updated successfully',
                description: 'Your changes have been saved.',
            });
            setIsEditMode(false);
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

    const handleUpdateFact = async () => {
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
    };

    const confirmDeleteFact = () => {
        const factId = fact?.id || fact?._id;
        if (DeleteFact && factId) {
            DeleteFact(factId);
            setDeleteDialogOpen(false);
        }
    };

    const handleEditClick = () => {
        if (fact) {
            refetch().then(() => {
                const factData = factSingle?.facts || factSingle || fact;
                form.setValue('name', factData.name);
                form.setValue('field_type', factData.field_type || '');
                form.setValue('icon', factData.icon || '');

                let parsedValues: string[] = [];
                if (Array.isArray(factData.value)) {
                    parsedValues = factData.value.map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (typeof item === 'object' && item !== null && 'value' in item) return item.value;
                        return '';
                    });
                }
                form.setValue('value', parsedValues);
                setValuesTag(parsedValues);
                setSelectedIcon(factData.icon || null);
                setIsEditMode(true);
            });
        }
    };

    const handleCancelClick = () => {
        setIsEditMode(false);
        form.reset();
    };

    const handleIconSelect = (iconName: string) => {
        setSelectedIcon(iconName);
        setIsOpen(false);
    };

    if (isEditMode) {
        return (
            <tr className="border-b bg-primary/5">
                <td colSpan={5} className="p-4">
                    <Form {...form}>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            form.handleSubmit(handleUpdateFact)();
                        }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fact Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter fact name" />
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
                                            <FormLabel>Fact Type</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Plain Text">Plain Text</SelectItem>
                                                    <SelectItem value="Single Select">Single Select</SelectItem>
                                                    <SelectItem value="Multi Select">Multi Select</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {(fieldType === 'Single Select' || fieldType === 'Multi Select') && (
                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Options</FormLabel>
                                            <FormControl>
                                                <InputTags
                                                    value={valuesTag}
                                                    placeholder="Enter options"
                                                    onChange={(newTags: string[]) => {
                                                        setValuesTag(newTags);
                                                        field.onChange(newTags);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            <FormField
                                control={form.control}
                                name="icon"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>Icon</FormLabel>
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
                                                        type="button"
                                                        onClick={() => setIsOpen(true)}
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
                            <div className="flex justify-end gap-2">
                                <Button type="submit" size="sm" disabled={updateFactMutation.isPending}>
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
                                const factId = fact?.id || fact?._id;
                                if (onSelectChange && factId && typeof checked === 'boolean') {
                                    onSelectChange(factId, checked);
                                }
                            }}
                        />
                    </div>
                </td>
                <td className="p-4">
                    <div className="flex items-center gap-2">
                        {fact?.icon && (
                            <div className="shrink-0 h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <Icon name={fact.icon} size={16} />
                            </div>
                        )}
                        <span className="font-medium">{fact?.name}</span>
                    </div>
                </td>
                <td className="p-4">
                    <Badge variant="secondary">{fact?.field_type}</Badge>
                </td>
                <td className="p-4">
                    {fact?.value && Array.isArray(fact.value) && fact.value.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {fact.value.slice(0, 3).map((item: any, index: number) => {
                                const tagValue = typeof item === 'object' && item !== null
                                    ? item.label || item.value
                                    : String(item);
                                return (
                                    <Badge key={index} variant="outline" className="text-xs">
                                        {tagValue}
                                    </Badge>
                                );
                            })}
                            {fact.value.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{fact.value.length - 3} more
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <span className="text-muted-foreground text-sm">No values</span>
                    )}
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
                            Are you sure you want to delete this fact? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteFact}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default FactTableRow;
