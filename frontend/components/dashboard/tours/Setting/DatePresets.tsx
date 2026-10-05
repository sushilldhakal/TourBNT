'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useDatePresets } from '@/lib/queries';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createDatePreset,
  updateDatePreset,
  deleteDatePreset,
  duplicateDatePreset,
  DatePreset,
} from '@/lib/api/tourSettingsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Plus, Trash2, Copy, Edit, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api/apiClient';

const DATE_TYPES = [
  { value: 'flexible', label: 'Flexible Dates' },
  { value: 'fixed', label: 'Fixed Dates' },
  { value: 'multiple', label: 'Multiple Departures' },
] as const;

export function DatePresets() {
  const { user } = useAuth();
  const { invalidatePresets } = useCacheManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<DatePreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'flexible' as 'flexible' | 'fixed' | 'multiple',
    config: {
      defaultDays: 1,
      defaultNights: 0,
      defaultCapacity: 10,
    },
  });

  const { data: presets, isLoading, refetch } = useDatePresets(user?.id ?? undefined, !!user?.id);

  const createMutation = useMutation({
    mutationFn: (data: Partial<DatePreset>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return createDatePreset(user.id, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Date preset created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to create preset'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: Partial<DatePreset> }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateDatePreset(user.id, presetId, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Date preset updated successfully');
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return deleteDatePreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Date preset deleted successfully');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return duplicateDatePreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Date preset duplicated successfully');
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData({
      name: '',
      type: 'flexible',
      config: { defaultDays: 1, defaultNights: 0, defaultCapacity: 10 },
    });
  };

  const handleOpenEditDialog = (preset: DatePreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      type: preset.type || 'flexible',
      config: {
        defaultDays: preset.config?.defaultDays ?? 1,
        defaultNights: preset.config?.defaultNights ?? 0,
        defaultCapacity: preset.config?.defaultCapacity ?? 10,
      },
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    const payload = {
      name: formData.name,
      type: formData.type,
      config: formData.config,
    };
    if (editingPreset) {
      updateMutation.mutate({ presetId: editingPreset._id || editingPreset.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const presetId = (p: DatePreset) => p._id || p.id;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Date & Departure Presets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Create reusable date/departure templates for tours
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? 'Edit Date Preset' : 'Create Date Preset'}
              </DialogTitle>
              <DialogDescription>
                Define a date structure (flexible, fixed, or multiple departures)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Preset Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Flexible Trekking, Fixed Summer Tours"
                />
              </div>

              <div>
                <Label>Date Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v: 'flexible' | 'fixed' | 'multiple') =>
                    setFormData({ ...formData, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'flexible' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Default Days</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.config.defaultDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, defaultDays: parseInt(e.target.value) || 1 },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Default Nights</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.config.defaultNights}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, defaultNights: parseInt(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {(formData.type === 'fixed' || formData.type === 'multiple') && (
                <div>
                  <Label>Default Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.config.defaultCapacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, defaultCapacity: parseInt(e.target.value) || 10 },
                      })
                    }
                  />
                </div>
              )}
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
              <CardTitle className="text-base sm:text-lg truncate">{preset.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm capitalize">
                {preset.type === 'flexible' && (
                  <>Flexible · {preset.config?.defaultDays ?? '?'} days</>
                )}
                {preset.type === 'fixed' && (
                  <>Fixed · Capacity {preset.config?.defaultCapacity ?? '?'}</>
                )}
                {preset.type === 'multiple' && <>Multiple departures</>}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pt-0">
              <div className="flex items-center justify-center py-4 flex-1">
                <Calendar className="h-10 w-10 text-muted-foreground" />
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
                {(preset.usageCount ?? 0) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Used {(preset.usageCount ?? 0)} time{(preset.usageCount ?? 0) !== 1 ? 's' : ''}
                  </div>
                )}
                <div className={(preset.usageCount ?? 0) > 0 ? 'ml-auto' : ''} style={{ marginLeft: 'auto' }}>
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
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No date presets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create date presets to quickly set up flexible, fixed, or multiple-departure schedules for your tours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
