import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputTags } from "@/components/ui/InputTags";
import { Edit, Save, Trash2, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import AllIcons from "./AllIcons";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/Icon";
import { FactData } from "./useFacts";
import { useFactItem } from "./useFactItem";

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
    const {
        isEditMode,
        deleteDialogOpen,
        setDeleteDialogOpen,
        valuesTag,
        setValuesTag,
        selectedIcon,
        isOpen,
        setIsOpen,
        form,
        fieldType,
        updateFactMutation,
        handleUpdateFact,
        handleDeleteFact,
        confirmDeleteFact,
        handleEditClick,
        handleCancelClick,
        handleIconSelect,
    } = useFactItem({ fact, DeleteFact });

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
                                            <Select
                                                onValueChange={(value) => {
                                                    if ((value === 'Single Select' || value === 'Multi Select') &&
                                                        (field.value !== 'Single Select' && field.value !== 'Multi Select')) {
                                                        setValuesTag([]);
                                                        form.setValue('value', []);
                                                    }
                                                    field.onChange(value);
                                                }}
                                                value={field.value || ''}
                                            >
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
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditClick(e);
                            }}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteFact();
                            }}
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
