/**
 * Tab Content Component Template
 * 
 * Use this template when creating new tab content components.
 * Each tab should be a separate component that uses the tour context.
 */

'use client';

import React from 'react';
import { useTourContext } from '@/providers/TourProvider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * Example Tab Content Component
 * Replace this with your actual tab implementation
 */
export function ExampleTabContent() {
    const { form } = useTourContext();
    const { register, formState: { errors } } = form;

    return (
        <>
            <CardHeader>
                <CardTitle>Tab Title</CardTitle>
                <CardDescription>
                    Brief description of what this tab is for
                </CardDescription>
            </CardHeader>

            <div className="space-y-6 p-6">
                {/* Example form field */}
                <div className="space-y-2">
                    <Label htmlFor="example">Example Field</Label>
                    <Input
                        id="example"
                        {...register('fieldName')}
                        placeholder="Enter value..."
                    />
                    {errors.fieldName && (
                        <p className="text-sm text-destructive">
                            {errors.fieldName.message as string}
                        </p>
                    )}
                </div>

                {/* Add more form fields as needed */}
            </div>
        </>
    );
}

/**
 * Usage in TourEditorLayout:
 * 
 * <TourEditorLayout onSave={handleSave}>
 *     {activeTab === 'example' && <ExampleTabContent />}
 * </TourEditorLayout>
 * 
 * Or with conditional rendering based on tab:
 * 
 * <TourEditorLayout onSave={handleSave}>
 *     <ExampleTabContent />
 * </TourEditorLayout>
 * 
 * The layout will handle showing/hiding based on active tab.
 */
