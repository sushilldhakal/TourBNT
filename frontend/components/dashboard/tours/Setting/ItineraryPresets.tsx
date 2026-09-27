'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useItineraryPresets } from '@/lib/queries';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createItineraryPreset,
  updateItineraryPreset,
  deleteItineraryPreset,
  duplicateItineraryPreset,
  ItineraryPreset,
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
import { Plus, Trash2, Copy, Edit, Route } from 'lucide-react';
import { toast } from 'sonner';

const defaultItineraryItem = () => ({ day: 'Day 1', title: '', description: '' });

export function ItineraryPresets() {
  const { user } = useAuth();
  const { invalidatePresets } = useCacheManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ItineraryPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    days: 1,
    nights: 0,
    itinerary: [defaultItineraryItem()],
  });

  const { data: presets, isLoading, refetch } = useItineraryPresets(user?.id, !!user?.id);

  const createMutation = useMutation({
    mutationFn: (data: Partial<ItineraryPreset>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return createItineraryPreset(user.id, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Itinerary preset created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create preset');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: Partial<ItineraryPreset> }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateItineraryPreset(user.id, presetId, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Itinerary preset updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update preset');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return deleteItineraryPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Itinerary preset deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete preset');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return duplicateItineraryPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Itinerary preset duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to duplicate preset');
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData({
      name: '',
      days: 1,
      nights: 0,
      itinerary: [defaultItineraryItem()],
    });
  };

  const handleOpenEditDialog = (preset: ItineraryPreset) => {
    setEditingPreset(preset);
    const itinerary = preset.itinerary?.length
      ? preset.itinerary.map((i) => ({ day: i.day || '', title: i.title || '', description: i.description || '' }))
      : [defaultItineraryItem()];
    setFormData({
      name: preset.name,
      days: preset.days ?? 1,
      nights: preset.nights ?? 0,
      itinerary,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    const validItems = formData.itinerary.filter((i) => i.title.trim());
    if (validItems.length === 0) {
      toast.error('Add at least one itinerary item with a title');
      return;
    }
    const payload = {
      name: formData.name,
      days: formData.days,
      nights: formData.nights,
      itinerary: validItems.map((i, idx) => ({
        day: i.day || `Day ${idx + 1}`,
        title: i.title.trim(),
        description: i.description?.trim() || undefined,
      })),
    };
    if (editingPreset) {
      updateMutation.mutate({ presetId: (editingPreset as any)._id || editingPreset.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addItineraryItem = () => {
    setFormData({
      ...formData,
      itinerary: [...formData.itinerary, defaultItineraryItem()],
    });
  };

  const removeItineraryItem = (idx: number) => {
    setFormData({
      ...formData,
      itinerary: formData.itinerary.filter((_, i) => i !== idx),
    });
  };

  const updateItineraryItem = (idx: number, field: 'day' | 'title' | 'description', value: string) => {
    const next = [...formData.itinerary];
    next[idx] = { ...next[idx], [field]: value };
    setFormData({ ...formData, itinerary: next });
  };

  const presetId = (p: ItineraryPreset) => (p as any)._id || (p as any).id;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Itinerary Presets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Reusable day-by-day itinerary templates for tours
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
                {editingPreset ? 'Edit Itinerary Preset' : 'Create Itinerary Preset'}
              </DialogTitle>
              <DialogDescription>
                Define a day-by-day itinerary template
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Preset Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 5-Day Trekking Itinerary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Days</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Nights</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.nights}
                    onChange={(e) => setFormData({ ...formData, nights: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Itinerary Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItineraryItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Day
                  </Button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {formData.itinerary.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Day 1"
                          value={item.day}
                          onChange={(e) => updateItineraryItem(idx, 'day', e.target.value)}
                          className="w-24"
                        />
                        <Input
                          placeholder="Title"
                          value={item.title}
                          onChange={(e) => updateItineraryItem(idx, 'title', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive"
                          onClick={() => removeItineraryItem(idx)}
                          disabled={formData.itinerary.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Description (optional)"
                        value={item.description}
                        onChange={(e) => updateItineraryItem(idx, 'description', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ))}
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
        {presets?.map((preset) => (
          <Card key={presetId(preset)} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">
                {preset.days} day{(preset.days ?? 0) !== 1 ? 's' : ''} / {preset.nights ?? 0} night{(preset.nights ?? 0) !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              <p className="font-medium text-base truncate">{preset.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(preset.itinerary?.length ?? 0)} day{(preset.itinerary?.length ?? 0) !== 1 ? 's' : ''} defined
              </p>
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
        ))}
      </div>

      {presets?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Route className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No itinerary presets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create itinerary presets to quickly set up day-by-day itineraries for your tours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
