import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button";
import { addFacts } from "@/lib/api/factsApi";
import { toast } from "@/components/ui/use-toast";
import { useState, useCallback } from "react";
import { getUserId } from "@/lib/auth/authUtils";
import { InputTags } from "@/components/ui/InputTags";
import AllIcons from "./AllIcons";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import Icon from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Save, X } from "lucide-react";

interface FactFormData {
    name: string;
    field_type: string;
    value: string[];
    icon: string;
    userId: string | null;
}

const AddFact = ({ onFactAdded }: { onFactAdded: () => void }) => {
    const userId = getUserId();
    const [valuesTag, setValuesTag] = useState<string[]>([]);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm({
        defaultValues: {
            name: '',
            field_type: '',
            value: [],
            icon: '',
            userId: userId,
        },
    });

    const { watch } = form;
    const fieldType = watch('field_type');

    const factMutation = useMutation({
        mutationFn: (data: FormData) => addFacts(data),
        onSuccess: () => {
            toast({
                title: 'Facts added successfully',
                description: 'Facts has been added successfully.',
            });
            onFactAdded();
            setValuesTag([]);
            setSelectedIcon(null);
            form.reset();
        },
        onError: (error: unknown) => {
            toast({
                title: 'Failed to create fact',
                description: `An error occurred while creating the fact.${error}`,
                variant: 'destructive',
            });
        },
    });

    const handleCreateFact = async (values: FactFormData) => {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('field_type', values.field_type);

        values.value.forEach((item, index) => {
            formData.append(`value[${index}]`, item);
        });
        if (selectedIcon) {
            formData.append('icon', selectedIcon);
        }
        formData.append('userId', values.userId || '');

        try {
            await factMutation.mutateAsync(formData);
        } catch (error) {
            toast({
                title: 'Failed to create fact',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        }
    };

    const handleIconSelect = useCallback((iconName: string) => {
        setSelectedIcon(iconName);
        form.setValue('icon', iconName);
        setIsOpen(false);
    }, [form]);

    return (
        <Form {...form}>
            <form onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(handleCreateFact)();
            }}>
                <Card className="shadow-xs border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                                New Fact
                            </Badge>
                        </div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 text-primary" />
                            Create Facts
                        </CardTitle>
                        <CardDescription>Add a new Fact to your store.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Facts Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Fact Name" />
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
                                        <FormLabel>Facts Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type for Fact Value" />
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
                            {(fieldType === 'Single Select' || fieldType === 'Multi Select') && (
                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tags</FormLabel>
                                            <FormControl>
                                                <InputTags
                                                    value={valuesTag}
                                                    placeholder="Enter your facts tags"
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
                                            <div className="flex items-center">
                                                {selectedIcon && (
                                                    <div className="mr-2 flex items-center justify-center">
                                                        <Icon
                                                            name={selectedIcon}
                                                            size={24}
                                                            className="text-primary"
                                                        />
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            {selectedIcon}
                                                        </span>
                                                    </div>
                                                )}
                                                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline">Choose Icons</Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="h-[80vh] max-w-[90vw]">
                                                        <DialogHeader>
                                                            <DialogTitle>Icons</DialogTitle>
                                                            <DialogDescription>
                                                                Add Icons to facts
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4 overflow-y-auto">
                                                            <AllIcons onSelectIcon={handleIconSelect} />
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" className="flex gap-2" onClick={() => {
                            form.reset();
                            setValuesTag([]);
                            setSelectedIcon(null);
                        }}>
                            <X className="h-4 w-4" /> Cancel
                        </Button>
                        <Button type="submit" className="flex gap-2 bg-green-700 text-white">
                            <Save className="h-4 w-4" />
                            Create Facts
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}

export default AddFact;
