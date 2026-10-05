'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, usePaxPresets } from '@/lib/queries';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createPaxPreset,
  updatePaxPreset,
  deletePaxPreset,
  duplicatePaxPreset,
  PaxPreset,
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
import { Plus, Trash2, Copy, Edit, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { apiErrorMessage } from '@/lib/api/apiClient';

export function PaxPresets() {
  const { user } = useAuth();
  const { invalidatePresets } = useCacheManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PaxPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    minSize: 1,
    maxSize: 10,
    pricePerPerson: true,
    groupSize: 1,
  });

  const { data: presets, isLoading, refetch } = usePaxPresets(user?.id ?? undefined, !!user?.id);

  const createMutation = useMutation({
    mutationFn: (data: Partial<PaxPreset>) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return createPaxPreset(user.id, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pax preset created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to create preset'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: Partial<PaxPreset> }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return updatePaxPreset(user.id, presetId, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pax preset updated successfully');
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return deletePaxPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pax preset deleted successfully');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return duplicatePaxPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pax preset duplicated successfully');
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData({
      name: '',
      minSize: 1,
      maxSize: 10,
      pricePerPerson: true,
      groupSize: 1,
    });
  };

  const handleOpenEditDialog = (preset: PaxPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      minSize: preset.minSize,
      maxSize: preset.maxSize,
      pricePerPerson: preset.pricePerPerson,
      groupSize: preset.groupSize || 1,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (formData.minSize > formData.maxSize) {
      toast.error('Minimum size cannot be greater than maximum size');
      return;
    }

    if (editingPreset) {
      updateMutation.mutate({ presetId: editingPreset.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Group Size Presets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Define group size limits for your tours
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
                {editingPreset ? 'Edit Pax Preset' : 'Create Pax Preset'}
              </DialogTitle>
              <DialogDescription>
                Set minimum and maximum group sizes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Preset Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Small Group, Large Group"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Size</Label>
                  <Input
                    type="number"
                    value={formData.minSize}
                    onChange={(e) =>
                      setFormData({ ...formData, minSize: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <Label>Maximum Size</Label>
                  <Input
                    type="number"
                    value={formData.maxSize}
                    onChange={(e) =>
                      setFormData({ ...formData, maxSize: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.pricePerPerson}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, pricePerPerson: checked })
                  }
                />
                <Label>Price Per Person</Label>
              </div>

              {!formData.pricePerPerson && (
                <div>
                  <Label>Group Size</Label>
                  <Input
                    type="number"
                    value={formData.groupSize}
                    onChange={(e) =>
                      setFormData({ ...formData, groupSize: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {presets?.map((preset) => (
          <Card key={preset.id} className="flex flex-col hover:shadow-md transition-shadow">
            {/* Title at top */}
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg truncate">{preset.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {preset.minSize}-{preset.maxSize} people
              </CardDescription>
            </CardHeader>

            {/* Content in middle */}
            <CardContent className="flex-1 flex flex-col pt-0">
              <div className="text-sm space-y-2 flex-1">
                <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md border border-border/50">
                  <span className="text-muted-foreground">Min:</span>
                  <span className="font-medium">{preset.minSize}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md border border-border/50">
                  <span className="text-muted-foreground">Max:</span>
                  <span className="font-medium">{preset.maxSize}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md border border-border/50">
                  <span className="text-muted-foreground">Pricing:</span>
                  <span className="font-medium">
                    {preset.pricePerPerson ? 'Per Person' : 'Per Group'}
                  </span>
                </div>
              </div>

              {/* Action buttons at bottom */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
                {preset.usageCount! > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Used {preset.usageCount} time{preset.usageCount !== 1 ? 's' : ''}
                  </div>
                )}
                <div className={`flex gap-1 ${preset.usageCount! > 0 ? 'ml-auto' : ''}`}>
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
                    onClick={() => duplicateMutation.mutate(preset.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this preset?')) {
                        deleteMutation.mutate(preset.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {presets?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pax presets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create presets for common group sizes to quickly configure your tours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
