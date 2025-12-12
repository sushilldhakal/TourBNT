'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const travelerSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    passportNumber: z.string().optional(),
});

const formSchema = z.object({
    travelers: z.array(travelerSchema).min(1, 'At least one traveler is required'),
});

export type TravelerInfo = z.infer<typeof travelerSchema>;
type FormData = z.infer<typeof formSchema>;

interface TravelerFormProps {
    numberOfTravelers?: number;
    onSubmit: (travelers: TravelerInfo[]) => void;
    onBack?: () => void;
}

export function TravelerForm({ numberOfTravelers = 1, onSubmit, onBack }: TravelerFormProps) {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            travelers: Array.from({ length: numberOfTravelers }, () => ({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                dateOfBirth: '',
                passportNumber: '',
            })),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'travelers',
    });

    const handleFormSubmit = (data: FormData) => {
        onSubmit(data.travelers);
    };

    const addTraveler = () => {
        append({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
            passportNumber: '',
        });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <Card key={field.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">
                                        Traveler {index + 1}
                                        {index === 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">(Primary Contact)</span>}
                                    </CardTitle>
                                </div>
                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => remove(index)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <CardDescription>
                                {index === 0
                                    ? 'Primary contact will receive all booking communications'
                                    : 'Additional traveler information'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor={`travelers.${index}.firstName`}>
                                        First Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id={`travelers.${index}.firstName`}
                                        {...register(`travelers.${index}.firstName`)}
                                        placeholder="John"
                                        className={cn(
                                            errors.travelers?.[index]?.firstName && 'border-destructive'
                                        )}
                                    />
                                    {errors.travelers?.[index]?.firstName && (
                                        <p className="text-sm text-destructive">
                                            {errors.travelers[index]?.firstName?.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`travelers.${index}.lastName`}>
                                        Last Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id={`travelers.${index}.lastName`}
                                        {...register(`travelers.${index}.lastName`)}
                                        placeholder="Doe"
                                        className={cn(
                                            errors.travelers?.[index]?.lastName && 'border-destructive'
                                        )}
                                    />
                                    {errors.travelers?.[index]?.lastName && (
                                        <p className="text-sm text-destructive">
                                            {errors.travelers[index]?.lastName?.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor={`travelers.${index}.email`}>
                                        Email <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id={`travelers.${index}.email`}
                                        type="email"
                                        {...register(`travelers.${index}.email`)}
                                        placeholder="john.doe@example.com"
                                        className={cn(
                                            errors.travelers?.[index]?.email && 'border-destructive'
                                        )}
                                    />
                                    {errors.travelers?.[index]?.email && (
                                        <p className="text-sm text-destructive">
                                            {errors.travelers[index]?.email?.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`travelers.${index}.phone`}>
                                        Phone <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id={`travelers.${index}.phone`}
                                        type="tel"
                                        {...register(`travelers.${index}.phone`)}
                                        placeholder="+1 (555) 123-4567"
                                        className={cn(
                                            errors.travelers?.[index]?.phone && 'border-destructive'
                                        )}
                                    />
                                    {errors.travelers?.[index]?.phone && (
                                        <p className="text-sm text-destructive">
                                            {errors.travelers[index]?.phone?.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor={`travelers.${index}.dateOfBirth`}>
                                        Date of Birth <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id={`travelers.${index}.dateOfBirth`}
                                        type="date"
                                        {...register(`travelers.${index}.dateOfBirth`)}
                                        className={cn(
                                            errors.travelers?.[index]?.dateOfBirth && 'border-destructive'
                                        )}
                                    />
                                    {errors.travelers?.[index]?.dateOfBirth && (
                                        <p className="text-sm text-destructive">
                                            {errors.travelers[index]?.dateOfBirth?.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`travelers.${index}.passportNumber`}>
                                        Passport Number <span className="text-muted-foreground text-xs">(Optional)</span>
                                    </Label>
                                    <Input
                                        id={`travelers.${index}.passportNumber`}
                                        {...register(`travelers.${index}.passportNumber`)}
                                        placeholder="A12345678"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={addTraveler}
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Traveler
                </Button>

                <Separator />

                <div className="flex gap-2 justify-between">
                    {onBack && (
                        <Button type="button" variant="outline" onClick={onBack}>
                            Back
                        </Button>
                    )}
                    <Button type="submit" className="ml-auto">
                        Continue to Payment
                    </Button>
                </div>
            </div>
        </form>
    );
}
