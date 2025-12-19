'use client';

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { GripVertical, Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getDefaultItineraryItem } from '@/lib/utils/defaultTourValues';
import NovelEditor from '@/components/dashboard/editor/NovelEditor';
/**
 * TourItinerary Component
 * Handles tour itinerary with outline and dynamic day-by-day items
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

export function TourItinerary() {
    const { register, setValue, watch, control, formState: { errors } } = useFormContext();
    const [outlineContent, setOutlineContent] = React.useState<any>(null);
    const [isInitialized, setIsInitialized] = React.useState(false);
    const [deleteIndex, setDeleteIndex] = React.useState<number | null>(null);

    // Watch itinerary structure
    const itinerary = watch('itinerary') || {};

    // Field array for itinerary items
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'itinerary.options.0', // Using first option array for simplicity
    });

    // Initialize outline content from existing data
    React.useEffect(() => {
        if (!isInitialized && itinerary.outline) {
            try {
                const outline = typeof itinerary.outline === 'string'
                    ? JSON.parse(itinerary.outline)
                    : itinerary.outline;
                setOutlineContent(outline);
                setIsInitialized(true);
            } catch (e) {
                console.error('Error parsing outline:', e);
                setIsInitialized(true);
            }
        }
    }, [itinerary.outline, isInitialized]);

    // Handle outline content change
    const handleOutlineChange = (content: any) => {
        setOutlineContent(content);
        setValue('itinerary.outline', JSON.stringify(content));
    };

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
            move(dragIndex, dropIndex);
        }
    };

    // Handle delete with confirmation
    const handleDeleteClick = (index: number) => {
        setDeleteIndex(index);
    };

    const handleDeleteConfirm = () => {
        if (deleteIndex !== null) {
            remove(deleteIndex);
            setDeleteIndex(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteIndex(null);
    };

    return (
        <div className="space-y-8">
            {/* Itinerary Outline */}
            <Card>
                <CardHeader>
                    <CardTitle>Itinerary Outline</CardTitle>
                    <CardDescription>
                        Provide a general overview of the tour itinerary
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <NovelEditor
                        initialValue={outlineContent}
                        onContentChange={handleOutlineChange}
                        placeholder="List what's included in the tour (e.g., accommodation, meals, transportation, activities)..."
                        minHeight="250px"
                        enableAI={false}
                        enableGallery={true}
                    />
                    {(errors.include as any) && (
                        <p className="text-sm text-destructive mt-2">
                            {(errors.include as any)?.message as string}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                        Tip: Use bullet points to make the list easy to read. Press '/' for formatting options.
                    </p>
                </CardContent>
            </Card>

            {/* Day-by-Day Itinerary */}
            <Card>
                <CardHeader>
                    <CardTitle>Day-by-Day Itinerary</CardTitle>
                    <CardDescription>
                        Add detailed itinerary items for each day of the tour
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No itinerary items yet. Add your first day to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <ItineraryItem
                                    key={field.id}
                                    index={index}
                                    onRemove={() => handleDeleteClick(index)}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                />
                            ))}
                        </div>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append(getDefaultItineraryItem({ day: `Day ${fields.length + 1}` }))}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Itinerary Day
                    </Button>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteIndex !== null} onOpenChange={(open) => !open && handleDeleteCancel()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete Itinerary Day?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete Day {deleteIndex !== null ? deleteIndex + 1 : ''}?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleDeleteCancel}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Itinerary Item Component
 * Individual day item with drag-and-drop support
 */
interface ItineraryItemProps {
    index: number;
    onRemove: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

function ItineraryItem({ index, onRemove, onDragStart, onDragOver, onDrop }: ItineraryItemProps) {
    const { register, formState: { errors } } = useFormContext();

    return (
        <Card
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="cursor-move hover:shadow-md transition-shadow"
        >
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <h4 className="font-semibold">Day {index + 1}</h4>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>

                {/* Day Label */}
                <div className="space-y-2">
                    <Label htmlFor={`itinerary.options.0.${index}.day`}>
                        Day Label
                    </Label>
                    <Input
                        id={`itinerary.options.0.${index}.day`}
                        placeholder="e.g., Day 1, Morning"
                        {...register(`itinerary.options.0.${index}.day`)}
                    />
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <Label htmlFor={`itinerary.options.0.${index}.title`}>
                        Title
                    </Label>
                    <Input
                        id={`itinerary.options.0.${index}.title`}
                        placeholder="e.g., Arrival and City Tour"
                        {...register(`itinerary.options.0.${index}.title`)}
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor={`itinerary.options.0.${index}.description`}>
                        Description
                    </Label>
                    <Textarea
                        id={`itinerary.options.0.${index}.description`}
                        placeholder="Describe the activities for this day..."
                        rows={4}
                        {...register(`itinerary.options.0.${index}.description`)}
                    />
                </div>

                {/* Destination */}
                <div className="space-y-2">
                    <Label htmlFor={`itinerary.options.0.${index}.destination`}>
                        Destination
                    </Label>
                    <Input
                        id={`itinerary.options.0.${index}.destination`}
                        placeholder="e.g., Paris, France"
                        {...register(`itinerary.options.0.${index}.destination`)}
                    />
                </div>

                {/* Additional Details Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={`itinerary.options.0.${index}.accommodation`}>
                            Accommodation
                        </Label>
                        <Input
                            id={`itinerary.options.0.${index}.accommodation`}
                            placeholder="Hotel name"
                            {...register(`itinerary.options.0.${index}.accommodation`)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`itinerary.options.0.${index}.meals`}>
                            Meals
                        </Label>
                        <Input
                            id={`itinerary.options.0.${index}.meals`}
                            placeholder="B, L, D"
                            {...register(`itinerary.options.0.${index}.meals`)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`itinerary.options.0.${index}.activities`}>
                            Activities
                        </Label>
                        <Input
                            id={`itinerary.options.0.${index}.activities`}
                            placeholder="Main activities"
                            {...register(`itinerary.options.0.${index}.activities`)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
