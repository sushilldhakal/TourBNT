'use client';

import Link from 'next/link';
import React, { useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTourContext } from '@/providers/TourProvider';
import {
  applyPricingPreset,
  applyDatePreset,
  applyPaxPreset,
  applyDiscountPreset,
  applyContentPreset,
  applyItineraryPreset,
  applyTourTemplatePreset,
} from '@/lib/api/tourSettingsApi';
import { useTourTemplatePresets, useContentPresets, useItineraryPresets } from '@/lib/queries/usePresets';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { LayoutTemplate, FileText, Route, Loader2, Sparkles, Settings2 } from 'lucide-react';
import type { JSONContent } from 'novel';

/** API itinerary item may include _id, destination/destinationId */
type ItineraryPresetItem = {
  _id?: string;
  day?: string;
  title?: string;
  description?: string;
  destination?: string;
  destinationId?: string;
};

/** Convert plain text or HTML string to minimal Novel JSONContent */
function stringToJSONContent(s: string | null | undefined): JSONContent | null {
  if (s == null || s === '') return null;
  const text = typeof s === 'string' ? s : String(s);
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

/** Parse API content (string or already JSONContent) for description/include/exclude/outline */
function parseContent(value: unknown): JSONContent | null {
  if (value == null) return null;
  if (typeof value === 'object' && value !== null && 'type' in (value as object)) {
    return value as JSONContent;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'type' in parsed) return parsed as JSONContent;
    } catch {
      return stringToJSONContent(value);
    }
  }
  return stringToJSONContent(String(value));
}

/** Form uses nested pricing/dates; setValue accepts those paths at runtime */
type SetValueForm = (name: string, value: unknown, options?: { shouldDirty?: boolean }) => void;

export function ApplyPresetsBar() {
  const { form } = useTourContext();
  const setValue = form.setValue as unknown as SetValueForm;
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [templateId, setTemplateId] = useState<string>('');
  const [contentPresetId, setContentPresetId] = useState<string>('');
  const [itineraryPresetId, setItineraryPresetId] = useState<string>('');
  const [applying, setApplying] = useState<'template' | 'content' | 'itinerary' | null>(null);

  const { data: templatePresets = [], isLoading: loadingTemplates } = useTourTemplatePresets(userId, !!userId);
  const { data: contentPresets = [], isLoading: loadingContent } = useContentPresets(userId, !!userId);
  const { data: itineraryPresets = [], isLoading: loadingItinerary } = useItineraryPresets(userId, !!userId);

  const applyTemplate = useCallback(async () => {
    if (!templateId || !userId) return;
    setApplying('template');
    try {
      const template = await applyTourTemplatePreset(userId, templateId);

      // Default category/destination
      if (template.defaultCategoryId) {
        setValue('category', [{ label: template.defaultCategoryId, value: template.defaultCategoryId, disable: false }], { shouldDirty: true });
      }
      if (template.defaultDestinationId) {
        setValue('destination', template.defaultDestinationId, { shouldDirty: true });
      }

      const ids = [
        template.pricingPresetId && ['pricing', template.pricingPresetId] as const,
        template.datePresetId && ['date', template.datePresetId] as const,
        template.paxPresetId && ['pax', template.paxPresetId] as const,
        template.discountPresetId && ['discount', template.discountPresetId] as const,
        template.itineraryPresetId && ['itinerary', template.itineraryPresetId] as const,
        template.descriptionPresetId && ['description', template.descriptionPresetId] as const,
        template.includePresetId && ['include', template.includePresetId] as const,
        template.excludePresetId && ['exclude', template.excludePresetId] as const,
      ].filter(Boolean) as [string, string][];

      for (const [kind, presetId] of ids) {
        try {
          if (kind === 'pricing') {
            const { pricingOptions, pricingOptionsEnabled } = await applyPricingPreset(userId, presetId);
            const options = Array.isArray(pricingOptions) ? pricingOptions : [];
            setValue('pricing.pricingOptions', options as never, { shouldDirty: true });
            setValue('pricing.pricingOptionsEnabled', pricingOptionsEnabled, { shouldDirty: true });
          } else if (kind === 'date') {
            const { tourDates } = await applyDatePreset(userId, presetId);
            if (tourDates && typeof tourDates === 'object') {
              const t = tourDates as Record<string, unknown>;
              if (t.type) setValue('dates.scheduleType', t.type as string, { shouldDirty: true });
              if (typeof t.days === 'number') setValue('dates.days', t.days, { shouldDirty: true });
              if (typeof t.nights === 'number') setValue('dates.nights', t.nights, { shouldDirty: true });
              if (t.dateRange) setValue('dates.dateRange', t.dateRange, { shouldDirty: true });
              if (Array.isArray(t.departures)) setValue('dates.departures', t.departures, { shouldDirty: true });
              if (typeof t.capacity === 'number') setValue('dates.capacity', t.capacity, { shouldDirty: true });
              if (t.recurrence) setValue('dates.recurrence', t.recurrence, { shouldDirty: true });
            }
          } else if (kind === 'pax') {
            const pax = await applyPaxPreset(userId, presetId);
            setValue('pricing.minSize', pax.minSize, { shouldDirty: true });
            setValue('pricing.maxSize', pax.maxSize, { shouldDirty: true });
            setValue('pricing.pricePerPerson', pax.pricePerPerson, { shouldDirty: true });
          } else if (kind === 'discount') {
            const disc = await applyDiscountPreset(userId, presetId);
            const d = (disc as { discount?: { type?: string; value?: number; dateRange?: unknown } }).discount ?? disc;
            const type = (d.type as 'percentage' | 'price') || 'percentage';
            const value = typeof d.value === 'number' ? d.value : 0;
            const dateRange = (d as { dateRange?: { from?: string; to?: string } }).dateRange;
            setValue('pricing.discount', {
              discountEnabled: true,
              type,
              value,
              dateRange: dateRange ? { from: String(dateRange.from ?? ''), to: String(dateRange.to ?? '') } : undefined,
            }, { shouldDirty: true });
          } else if (kind === 'itinerary') {
            const { itinerary, outline } = await applyItineraryPreset(userId, presetId);
            const items = ((itinerary ?? []) as ItineraryPresetItem[]).map((item) => ({
              _id: item._id,
              day: item.day ?? '',
              title: item.title ?? '',
              description: item.description ?? '',
              destination: item.destination ?? item.destinationId ?? '',
            }));
            setValue('itinerary', items, { shouldDirty: true });
            if (outline != null) {
              const outlineContent = parseContent(outline);
              if (outlineContent) setValue('outline', outlineContent, { shouldDirty: true });
            }
          } else if (kind === 'description') {
            const data = await applyContentPreset(userId, presetId);
            const content = parseContent(data.description ?? data.content);
            if (content) setValue('description', content, { shouldDirty: true });
          } else if (kind === 'include') {
            const data = await applyContentPreset(userId, presetId);
            const content = parseContent(data.include ?? data.content);
            if (content) setValue('include', content, { shouldDirty: true });
          } else if (kind === 'exclude') {
            const data = await applyContentPreset(userId, presetId);
            const content = parseContent(data.exclude ?? data.content);
            if (content) setValue('exclude', content, { shouldDirty: true });
          }
        } catch (err) {
          console.warn(`Apply preset ${kind} failed:`, err);
        }
      }

      toast({ title: 'Template applied', description: 'Tour template presets have been applied to the form.' });
      setTemplateId('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to apply template';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setApplying(null);
    }
  }, [templateId, userId, setValue]);

  const applyContent = useCallback(async () => {
    if (!contentPresetId || !userId) return;
    setApplying('content');
    try {
      const data = await applyContentPreset(userId, contentPresetId);
      const desc = parseContent(data.description ?? data.content);
      const inc = parseContent(data.include ?? data.content);
      const exc = parseContent(data.exclude ?? data.content);
      const outlineContent = parseContent(data.outline ?? data.content);
      if (desc) setValue('description', desc, { shouldDirty: true });
      if (inc) setValue('include', inc, { shouldDirty: true });
      if (exc) setValue('exclude', exc, { shouldDirty: true });
      if (outlineContent) setValue('outline', outlineContent, { shouldDirty: true });
      if (desc || inc || exc || outlineContent) {
        toast({ title: 'Content preset applied' });
        setContentPresetId('');
      } else {
        toast({ variant: 'destructive', title: 'No content', description: 'This preset has no content to apply.' });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to apply content preset';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setApplying(null);
    }
  }, [contentPresetId, userId, setValue]);

  const applyItinerary = useCallback(async () => {
    if (!itineraryPresetId || !userId) return;
    setApplying('itinerary');
    try {
      const { itinerary, outline } = await applyItineraryPreset(userId, itineraryPresetId);
      const items = ((itinerary ?? []) as ItineraryPresetItem[]).map((item) => ({
        _id: item._id,
        day: item.day ?? '',
        title: item.title ?? '',
        description: item.description ?? '',
        destination: item.destination ?? item.destinationId ?? '',
      }));
      setValue('itinerary', items, { shouldDirty: true });
      if (outline != null) {
        const outlineContent = parseContent(outline);
        if (outlineContent) setValue('outline', outlineContent, { shouldDirty: true });
      }
      toast({ title: 'Itinerary preset applied' });
      setItineraryPresetId('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to apply itinerary preset';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setApplying(null);
    }
  }, [itineraryPresetId, userId, setValue]);

  if (!userId) return null;

  // Radix Select forbids SelectItem value=""; filter to non-empty ids only
  const safeId = (p: { _id?: unknown }) => {
    const v = p._id != null ? String(p._id) : '';
    return v.trim();
  };
  const templatesWithId = templatePresets.filter((p) => safeId(p).length > 0);
  const contentWithId = contentPresets.filter((p) => safeId(p).length > 0);
  const itineraryWithId = itineraryPresets.filter((p) => safeId(p).length > 0);
  const hasAnyPresets = templatesWithId.length > 0 || contentWithId.length > 0 || itineraryWithId.length > 0;
  const isLoading = loadingTemplates || loadingContent || loadingItinerary;

  return (
    <div className="mb-6 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 to-muted/20 p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Quick apply presets</p>
          <p className="text-xs text-muted-foreground">
            Fill pricing, dates, content or itinerary from your saved presets
          </p>
        </div>
      </div>

      {/* Preset rows */}
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
        {/* Tour template */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/20">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-muted-foreground">Template</span>
          </div>
          <div className="flex gap-2">
            <Select
              value={templateId}
              onValueChange={setTemplateId}
              disabled={loadingTemplates}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder={loadingTemplates ? 'Loading...' : 'Select template'} />
              </SelectTrigger>
              <SelectContent>
                {templatesWithId.map((p) => {
                  const id = safeId(p);
                  return (
                    <SelectItem key={id} value={id}>
                      {p.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9 shrink-0 gap-1.5 px-3"
              onClick={applyTemplate}
              disabled={!templateId || applying === 'template'}
            >
              {applying === 'template' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>

        {/* Content preset */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/20">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">Content</span>
          </div>
          <div className="flex gap-2">
            <Select
              value={contentPresetId}
              onValueChange={setContentPresetId}
              disabled={loadingContent}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder={loadingContent ? 'Loading...' : 'Description / include / exclude'} />
              </SelectTrigger>
              <SelectContent>
                {contentWithId.map((p) => {
                  const id = safeId(p);
                  return (
                    <SelectItem key={id} value={id}>
                      {p.name} {p.contentType ? `(${p.contentType})` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              className="h-9 shrink-0 gap-1.5 px-3"
              onClick={applyContent}
              disabled={!contentPresetId || applying === 'content'}
            >
              {applying === 'content' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>

        {/* Itinerary preset */}
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/20">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-muted-foreground">Itinerary</span>
          </div>
          <div className="flex gap-2">
            <Select
              value={itineraryPresetId}
              onValueChange={setItineraryPresetId}
              disabled={loadingItinerary}
            >
              <SelectTrigger className="h-9 flex-1 text-xs">
                <SelectValue placeholder={loadingItinerary ? 'Loading...' : 'Select itinerary'} />
              </SelectTrigger>
              <SelectContent>
                {itineraryWithId.map((p) => {
                  const id = safeId(p);
                  return (
                    <SelectItem key={id} value={id}>
                      {p.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              className="h-9 shrink-0 gap-1.5 px-3"
              onClick={applyItinerary}
              disabled={!itineraryPresetId || applying === 'itinerary'}
            >
              {applying === 'itinerary' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!hasAnyPresets && !isLoading && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border/80 bg-background/40 px-3 py-2.5">
          <Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            No presets yet.{' '}
            <Link
              href="/dashboard/tours/settings"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create presets in Tour settings
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
