'use client';

import React, { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  useCacheManager,
  useTourTemplatePresets,
  usePricingPresets,
  useDatePresets,
  usePaxPresets,
  useDiscountPresets,
  useItineraryPresets,
  useContentPresets,
  useMyActiveCategories,
  useMyActiveDestinations,
} from '@/lib/queries';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createTourTemplatePreset,
  updateTourTemplatePreset,
  deleteTourTemplatePreset,
  duplicateTourTemplatePreset,
  TourTemplatePreset,
} from '@/lib/api/tourSettingsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Copy, Edit, LayoutTemplate, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const BUNDLE_LABELS = {
  pricingPresetId: 'Pricing preset',
  datePresetId: 'Date preset',
  paxPresetId: 'Pax preset',
  discountPresetId: 'Discount preset',
  itineraryPresetId: 'Itinerary preset',
  descriptionPresetId: 'Description content preset',
  includePresetId: 'Include content preset',
  excludePresetId: 'Exclude content preset',
  defaultCategoryId: 'Default category',
  defaultDestinationId: 'Default destination',
} as const;

export function TourTemplatePresets() {
  const { user } = useAuth();
  const { invalidatePresets } = useCacheManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<TourTemplatePreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricingPresetId: '',
    datePresetId: '',
    paxPresetId: '',
    discountPresetId: '',
    itineraryPresetId: '',
    descriptionPresetId: '',
    includePresetId: '',
    excludePresetId: '',
    defaultCategoryId: '',
    defaultDestinationId: '',
  });

  const userId = user?.id ?? undefined;
  const { data: presets, isLoading, refetch } = useTourTemplatePresets(userId, !!userId);
  const { data: pricingPresets } = usePricingPresets(userId, !!userId && isDialogOpen);
  const { data: datePresets } = useDatePresets(userId, !!userId && isDialogOpen);
  const { data: paxPresets } = usePaxPresets(userId, !!userId && isDialogOpen);
  const { data: discountPresets } = useDiscountPresets(userId, !!userId && isDialogOpen);
  const { data: itineraryPresets } = useItineraryPresets(userId, !!userId && isDialogOpen);
  const { data: contentPresets } = useContentPresets(userId, !!userId && isDialogOpen);
  const { data: categoriesData } = useMyActiveCategories();
  const { data: destinationsData } = useMyActiveDestinations();
  // User's active categories/destinations: support response.data, .items, or raw array
  const categories = useMemo(() => {
    const raw = categoriesData as { data?: unknown[]; items?: unknown[] } | unknown[] | undefined;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Array<{ _id?: string; id?: string; name?: string }>;
    const list = raw?.data ?? raw?.items ?? [];
    return Array.isArray(list) ? (list as Array<{ _id?: string; id?: string; name?: string }>) : [];
  }, [categoriesData]);
  const destinations = useMemo(() => {
    const raw = destinationsData as { data?: unknown[]; items?: unknown[] } | unknown[] | undefined;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Array<{ _id?: string; id?: string; name?: string }>;
    const list = raw?.data ?? raw?.items ?? [];
    return Array.isArray(list) ? (list as Array<{ _id?: string; id?: string; name?: string }>) : [];
  }, [destinationsData]);

  const descriptionContentPresets = useMemo(
    () => contentPresets?.filter((p) => p.contentType === 'description') ?? [],
    [contentPresets]
  );
  const includeContentPresets = useMemo(
    () => contentPresets?.filter((p) => p.contentType === 'include') ?? [],
    [contentPresets]
  );
  const excludeContentPresets = useMemo(
    () => contentPresets?.filter((p) => p.contentType === 'exclude') ?? [],
    [contentPresets]
  );

  const createMutation = useMutation({
    mutationFn: (data: Partial<TourTemplatePreset>) => {
      if (!userId) throw new Error('User not authenticated');
      return createTourTemplatePreset(userId, data);
    },
    onSuccess: () => {
      invalidatePresets(userId);
      refetch();
      toast.success('Tour template preset created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create preset');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: Partial<TourTemplatePreset> }) => {
      if (!userId) throw new Error('User not authenticated');
      return updateTourTemplatePreset(userId, presetId, data);
    },
    onSuccess: () => {
      invalidatePresets(userId);
      refetch();
      toast.success('Tour template preset updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update preset');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!userId) throw new Error('User not authenticated');
      return deleteTourTemplatePreset(userId, presetId);
    },
    onSuccess: () => {
      invalidatePresets(userId);
      refetch();
      toast.success('Tour template preset deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete preset');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!userId) throw new Error('User not authenticated');
      return duplicateTourTemplatePreset(userId, presetId);
    },
    onSuccess: () => {
      invalidatePresets(userId);
      refetch();
      toast.success('Tour template preset duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to duplicate preset');
    },
  });

  const emptyForm = {
    name: '',
    description: '',
    pricingPresetId: '',
    datePresetId: '',
    paxPresetId: '',
    discountPresetId: '',
    itineraryPresetId: '',
    descriptionPresetId: '',
    includePresetId: '',
    excludePresetId: '',
    defaultCategoryId: '',
    defaultDestinationId: '',
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData(emptyForm);
  };

  const handleOpenEditDialog = (preset: TourTemplatePreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      pricingPresetId: preset.pricingPresetId || '',
      datePresetId: preset.datePresetId || '',
      paxPresetId: preset.paxPresetId || '',
      discountPresetId: preset.discountPresetId || '',
      itineraryPresetId: preset.itineraryPresetId || '',
      descriptionPresetId: preset.descriptionPresetId || '',
      includePresetId: preset.includePresetId || '',
      excludePresetId: preset.excludePresetId || '',
      defaultCategoryId: preset.defaultCategoryId || '',
      defaultDestinationId: preset.defaultDestinationId || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    const hasAnyPreset =
      formData.pricingPresetId ||
      formData.datePresetId ||
      formData.paxPresetId ||
      formData.discountPresetId ||
      formData.itineraryPresetId ||
      formData.descriptionPresetId ||
      formData.includePresetId ||
      formData.excludePresetId;
    if (!hasAnyPreset) {
      toast.error('Select at least one preset to bundle');
      return;
    }
    const payload: Partial<TourTemplatePreset> = {
      name: formData.name,
      description: formData.description.trim() || undefined,
      pricingPresetId: formData.pricingPresetId || undefined,
      datePresetId: formData.datePresetId || undefined,
      paxPresetId: formData.paxPresetId || undefined,
      discountPresetId: formData.discountPresetId || undefined,
      itineraryPresetId: formData.itineraryPresetId || undefined,
      descriptionPresetId: formData.descriptionPresetId || undefined,
      includePresetId: formData.includePresetId || undefined,
      excludePresetId: formData.excludePresetId || undefined,
      defaultCategoryId: formData.defaultCategoryId || undefined,
      defaultDestinationId: formData.defaultDestinationId || undefined,
    };
    if (editingPreset) {
      updateMutation.mutate({ presetId: String((editingPreset as any)._id ?? (editingPreset as any).id ?? ''), data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const presetId = (p: TourTemplatePreset) => String((p as any)._id ?? (p as any).id ?? '');

  const id = (x: unknown) => String((x as any)?._id ?? (x as any)?.id ?? '').trim();
  /** Radix Select forbids empty string value; filter to non-empty ids only */
  const optionsWithId = (opts: unknown[]) => (opts ?? []).filter((o) => id(o).length > 0);

  /** Extract display name from API item (handles nested category/destination shapes) */
  const getDisplayName = (o: any, fallback = ''): string =>
    o?.name ?? o?.title ?? o?.category?.name ?? o?.globalCategory?.name
    ?? o?.destination?.name ?? o?.globalDestination?.name
    ?? (o?.city || o?.region || o?.country ? [o.city, o.region, o.country].filter(Boolean).join(', ') : undefined)
    ?? fallback;

  const renderSelect = (
    key: keyof typeof BUNDLE_LABELS,
    options: unknown[],
    placeholder = 'None',
    getLabel?: (o: any) => string
  ) => {
    const safeOptions = optionsWithId(options);
    const currentValue = formData[key]?.trim();
    const selectValue = currentValue && safeOptions.some((o) => id(o) === currentValue) ? currentValue : '__none__';
    const label = getLabel ?? ((o) => getDisplayName(o, id(o)));
    return (
      <div key={key}>
        <Label className="text-sm">{BUNDLE_LABELS[key]}</Label>
        <Select
          value={selectValue}
          onValueChange={(v) => setFormData({ ...formData, [key]: v === '__none__' ? '' : v })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{placeholder}</SelectItem>
            {safeOptions.map((o) => {
              const valueId = id(o);
              return (
                <SelectItem key={valueId} value={valueId}>
                  {label(o)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Tour Template Presets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bundle pricing, dates, itinerary, and content presets for quick tour creation
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? 'Edit Tour Template Preset' : 'Create Tour Template Preset'}
              </DialogTitle>
              <DialogDescription>
                Bundle pricing, date, pax, discount, itinerary, and content presets. When applied to a tour, all linked presets are applied at once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Preset Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Trekking Template"
                />
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this template"
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Bundled presets
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Select at least one preset. When you apply this template to a tour, all selected presets will be applied.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderSelect('pricingPresetId', pricingPresets ?? [], 'Select pricing preset')}
                  {renderSelect('datePresetId', datePresets ?? [], 'Select date preset')}
                  {renderSelect('paxPresetId', paxPresets ?? [], 'Select pax preset')}
                  {renderSelect('discountPresetId', discountPresets ?? [], 'Select discount preset')}
                  {renderSelect('itineraryPresetId', itineraryPresets ?? [], 'Select itinerary preset')}
                  {renderSelect('descriptionPresetId', descriptionContentPresets, 'Select description preset')}
                  {renderSelect('includePresetId', includeContentPresets, 'Select include preset')}
                  {renderSelect('excludePresetId', excludeContentPresets, 'Select exclude preset')}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-3">Defaults (optional)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderSelect('defaultCategoryId', categories, 'Select default category')}
                  {renderSelect('defaultDestinationId', destinations, 'Select default destination')}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {presets?.map((preset) => {
          const linked = [
            preset.pricingPresetId && 'Pricing',
            preset.datePresetId && 'Date',
            preset.paxPresetId && 'Pax',
            preset.discountPresetId && 'Discount',
            preset.itineraryPresetId && 'Itinerary',
            preset.descriptionPresetId && 'Desc',
            preset.includePresetId && 'Include',
            preset.excludePresetId && 'Exclude',
          ].filter(Boolean);
          return (
            <Card key={presetId(preset)} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs sm:text-sm">
                  {linked.length ? `Bundles: ${linked.join(', ')}` : 'No presets linked'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <p className="font-medium text-base truncate">{preset.name}</p>
                {preset.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{preset.description}</p>
                )}
                <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
                  {(preset as any).usageCount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Used {(preset as any).usageCount} time{(preset as any).usageCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div className={(preset as any).usageCount > 0 ? 'ml-auto' : ''} style={{ marginLeft: 'auto' }}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditDialog(preset)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => duplicateMutation.mutate(presetId(preset))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this preset?')) {
                            deleteMutation.mutate(presetId(preset));
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {presets?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tour template presets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create tour template presets to bundle pricing, dates, itinerary, and content presets for quick tour setup. Apply a template to pre-populate an entire tour in one step.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
