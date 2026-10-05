'use client';

import React, { useSyncExternalStore } from 'react';
import { useFieldArray } from 'react-hook-form';
import { useTourContext } from '@/providers/TourProvider';
import { GripVertical, Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
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
import { BusinessPartnerPicker } from './BusinessPartnerPicker';
import { LogisticsStatusPanel } from './LogisticsStatusPanel';
/**
 * TourItinerary Component
 * Handles tour itinerary with outline and dynamic day-by-day items
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

export function TourItinerary() {
    const { form, outlineContent } = useTourContext();
    const { setValue, control } = form;
    const [deleteIndex, setDeleteIndex] = React.useState<number | null>(null);
    const [openDays, setOpenDays] = React.useState<string[]>([]);
    const [openNewest, setOpenNewest] = React.useState(false);

    // Field array for itinerary items
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'itinerary.options.0', // Using first option array for simplicity
    });

    // The operations timeline links here with ?day=<index>#itinerary. The server snapshot is -1 so
    // hydration matches; the client snapshot then opens that existing day.
    const dayIndex = useSyncExternalStore(
        () => () => {},
        () => {
            const raw = new URLSearchParams(window.location.search).get('day');
            if (raw == null) return -1;
            const index = Number(raw);
            return Number.isInteger(index) && index >= 0 ? index : -1;
        },
        () => -1,
    );
    const [openedFromLink, setOpenedFromLink] = React.useState(false);
    if (!openedFromLink && dayIndex >= 0 && fields[dayIndex]) {
        setOpenedFromLink(true);
        const fieldId = fields[dayIndex].id;
        if (!openDays.includes(fieldId)) setOpenDays([...openDays, fieldId]);
    }
    React.useEffect(() => {
        if (!openedFromLink || dayIndex < 0) return;
        const timer = window.setTimeout(() => {
            document.getElementById(`itinerary-day-${dayIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        return () => window.clearTimeout(timer);
    }, [openedFromLink, dayIndex]);

    // Open a day just added once it is in the field array (adjusting state during render, not in an effect).
    if (openNewest && fields.length > 0) {
        const newestId = fields[fields.length - 1].id;
        setOpenNewest(false);
        if (!openDays.includes(newestId)) setOpenDays([...openDays, newestId]);
    }

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
            const removedId = fields[deleteIndex]?.id;
            remove(deleteIndex);
            if (removedId) setOpenDays((current) => current.filter((id) => id !== removedId));
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
                        onContentChange={(content) => setValue('outline', content, { shouldDirty: true })}
                        placeholder="A short overview of the route (e.g., Kathmandu → Pokhara → Annapurna Base Camp)..."
                        minHeight="250px"
                        enableAI={false}
                        enableGallery={true}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                        Tip: Use bullet points to make the list easy to read. Press &apos;/&apos; for formatting options.
                    </p>
                </CardContent>
            </Card>

            {/* Day-by-Day Itinerary */}
            <Card>
                <CardHeader>
                    <CardTitle>Day-by-Day Itinerary</CardTitle>
                    <CardDescription>
                        Days stay collapsed so you can jump to the one you need. Drag the handle to reorder, then open a day to edit it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No itinerary items yet. Add your first day to get started.</p>
                        </div>
                    ) : (
                        <Accordion type="multiple" value={openDays} onValueChange={setOpenDays} className="space-y-2">
                            {fields.map((field, index) => (
                                <ItineraryItem
                                    key={field.id}
                                    id={field.id}
                                    index={index}
                                    onRemove={() => handleDeleteClick(index)}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                />
                            ))}
                        </Accordion>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            append(getDefaultItineraryItem({ day: `Day ${fields.length + 1}` }));
                            setOpenNewest(true);
                        }}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Itinerary Day
                    </Button>
                </CardContent>
            </Card>

            <LogisticsStatusPanel />

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
    id: string;
    index: number;
    onRemove: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

function ItineraryItem({ id, index, onRemove, onDragStart, onDragOver, onDrop }: ItineraryItemProps) {
    const { form } = useTourContext();
    const { register, watch } = form;
    const [dragOver, setDragOver] = React.useState(false);
    const dayLabel = watch(`itinerary.options.0.${index}.day`);
    const title = watch(`itinerary.options.0.${index}.title`);
    const destination = watch(`itinerary.options.0.${index}.destination`);

    return (
        <AccordionItem value={id} id={`itinerary-day-${index}`} className="scroll-mt-24 border-none">
        <Card
            onDragOver={(event) => {
                onDragOver(event);
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
                setDragOver(false);
                onDrop(event);
            }}
            className={cn('overflow-hidden py-0 transition-shadow', dragOver && 'ring-2 ring-primary')}
        >
            <AccordionTrigger
                className="px-3 py-3 hover:no-underline hover:bg-muted/40"
                handle={
                    <span
                        draggable
                        onDragStart={onDragStart}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 pl-3"
                        aria-label={`Drag to reorder day ${index + 1}`}
                    >
                        <GripVertical className="h-5 w-5" />
                    </span>
                }
            >
                <div className="flex items-center gap-3 min-w-0 w-full pr-2">
                    <div className="min-w-0 text-left">
                        <div className="font-semibold truncate">
                            {dayLabel || `Day ${index + 1}`}
                            {title ? <span className="font-normal text-muted-foreground"> · {title}</span> : null}
                        </div>
                        {destination ? (
                            <div className="text-xs font-normal text-muted-foreground truncate">{destination}</div>
                        ) : null}
                    </div>
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemove();
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.stopPropagation();
                                onRemove();
                            }
                        }}
                        className="ml-auto h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete day</span>
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 border-t border-border space-y-4">
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
                        placeholder="e.g., Pokhara"
                        {...register(`itinerary.options.0.${index}.destination`)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Where the day is spent. It places this day on the tour&apos;s route map. Leave it empty if the day stays in the same place as the day before.
                    </p>
                </div>

                {/* Logistics — link a registered TourBNT business, or type a plain name if it's not registered */}
                <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-sm font-medium">Logistics for this day</p>
                    <p className="text-xs text-muted-foreground -mt-1">
                        Start typing to find a registered guide, hotel, restaurant or transport provider — travelers will see a link to their reviews. Otherwise just type a name.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <BusinessPartnerPicker
                            basePath={`itinerary.options.0.${index}`}
                            role="transport"
                            label="Transport / Logistics"
                            placeholder="e.g. ABC Travels — car to Pokhara"
                        />
                        <BusinessPartnerPicker
                            basePath={`itinerary.options.0.${index}`}
                            role="accommodation"
                            label="Accommodation"
                            placeholder="e.g. Hotel Everest View"
                        />
                        <BusinessPartnerPicker
                            basePath={`itinerary.options.0.${index}`}
                            role="guide"
                            label="Guide"
                            placeholder="e.g. Gandruk Trekking Guide"
                        />
                        <BusinessPartnerPicker
                            basePath={`itinerary.options.0.${index}`}
                            role="meals"
                            label="Restaurant"
                            placeholder="e.g. Local Kitchen Restaurant"
                        />
                    </div>
                </div>
            </AccordionContent>
        </Card>
        </AccordionItem>
    );
}
