'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PricingPresets, DatePresets, PaxPresets, DiscountPresets, ContentPresets, ItineraryPresets, TourTemplatePresets } from '@/components/dashboard/tours/Setting';
import { Settings2, DollarSign, Calendar, Users, Percent, FileText, Route, LayoutTemplate, Info, CheckCircle2, Lightbulb } from 'lucide-react';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';

export default function TourSettingsPage() {
    const [activeTab, setActiveTab] = useState('pricing');

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <DashboardCardHeader
                variant="compact"
                icon={Settings2}
                badge="Tour Settings"
                title="Tour Presets"
                description="Create and manage reusable templates for pricing options, group sizes, and discounts to streamline your tour creation process."
            />

            <Tabs defaultValue="pricing" value={activeTab} onValueChange={setActiveTab}>
                <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="p-4">
                                <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
                                    <TabsTrigger
                                        value="pricing"
                                        className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    >
                                        <DollarSign className="h-4 w-4" />
                                        <span>Pricing Options</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="date"
                                        className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    >
                                        <Calendar className="h-4 w-4" />
                                        <span>Dates & Departures</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="pax"
                                        className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    >
                                        <Users className="h-4 w-4" />
                                        <span>Group Size</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="discount"
                                        className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    >
                                        <Percent className="h-4 w-4" />
                                        <span>Discounts</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="content"
                                        className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    >
                                        <FileText className="h-4 w-4" />
                                        <span>Content</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="itinerary"
                                        className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    >
                                        <Route className="h-4 w-4" />
                                        <span>Itinerary</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="tour-template"
                                        className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    >
                                        <LayoutTemplate className="h-4 w-4" />
                                        <span>Tour Template</span>
                                    </TabsTrigger>
                                </TabsList>
                            </CardContent>
                        </Card>

                        <Card className="pt-0">
                            <CardHeader className="pb-3 pt-4 rounded-t-xl">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                    What are Presets?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-3">
                                <p>
                                    Presets are reusable templates that help you quickly configure new tours without repeating the same setup.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        <span className="text-xs">Save time on tour creation</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        <span className="text-xs">Maintain consistency</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        <span className="text-xs">Apply with one click</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <TabsContent value="pricing" className="mt-0 space-y-6">
                            <Card className="pt-0">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <DollarSign className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Pricing Options Presets</CardTitle>
                                            <CardDescription>
                                                Create pricing templates for different age groups, categories, and price ranges
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                                        <div className="flex gap-3">
                                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-primary-foreground dark:text-primary">
                                                    Define pricing structures with multiple options like Adult, Child, Senior, or custom categories. Each option can have its own base price, discount settings, and participant range.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <PricingPresets />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="date" className="mt-0 space-y-6">
                            <Card className="pt-0">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <Calendar className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Date & Departure Presets</CardTitle>
                                            <CardDescription>
                                                Create reusable date templates for flexible, fixed, or multiple-departure tours
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                                        <div className="flex gap-3">
                                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-primary-foreground dark:text-primary">
                                                    Define date structures: flexible (days/nights), fixed (single date range), or multiple departures. Apply these presets when creating tours to pre-fill the date configuration.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <DatePresets />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="pax" className="mt-0 space-y-6">
                            <Card className="pt-0">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <Users className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Group Size Presets</CardTitle>
                                            <CardDescription>
                                                Define minimum and maximum participant limits for your tours
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                                        <div className="flex gap-3">
                                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-primary-foreground dark:text-primary">
                                                    Set participant limits for different tour types. Perfect for creating presets for private tours, small groups, or large group experiences.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <PaxPresets />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="discount" className="mt-0 space-y-6">
                            <Card className="pt-0">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <Percent className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Discount Presets</CardTitle>
                                            <CardDescription>
                                                Create reusable discount templates for promotions and special offers
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                                        <div className="flex gap-3">
                                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-primary-foreground dark:text-primary">
                                                    Configure discount templates with percentage or fixed amount values. You can apply date ranges to create seasonal or time-limited promotions.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <DiscountPresets />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="content" className="mt-0 space-y-6">
                            <Card className="pt-0">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Content Presets</CardTitle>
                                            <CardDescription>
                                                Reusable description, include, exclude, or outline templates
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                                        <div className="flex gap-3">
                                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-primary-foreground dark:text-primary">
                                                    Create reusable content templates for tour descriptions, includes, excludes, or outlines. Apply these when creating tours to pre-fill content fields.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <ContentPresets />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="itinerary" className="mt-0 space-y-6">
                            <Card className="pt-0">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <Route className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Itinerary Presets</CardTitle>
                                            <CardDescription>
                                                Reusable day-by-day itinerary templates
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                                        <div className="flex gap-3">
                                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-primary-foreground dark:text-primary">
                                                    Define day-by-day itineraries (days, nights, titles, descriptions). Apply these presets when creating tours to quickly populate itinerary sections.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <ItineraryPresets />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="tour-template" className="mt-0 space-y-6">
                            <Card className="pt-0">
                                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <LayoutTemplate className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>Tour Template Presets</CardTitle>
                                            <CardDescription>
                                                Bundle multiple presets for quick tour creation
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-6">
                                        <div className="flex gap-3">
                                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-primary-foreground dark:text-primary">
                                                    Create tour templates that bundle pricing, dates, pax, discount, itinerary, and content presets. Apply a template to pre-populate an entire tour in one step.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <TourTemplatePresets />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
