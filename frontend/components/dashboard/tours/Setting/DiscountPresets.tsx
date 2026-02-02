'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useDiscountPresets } from '@/lib/queries';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createDiscountPreset,
  updateDiscountPreset,
  deleteDiscountPreset,
  duplicateDiscountPreset,
  DiscountPreset,
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
import { Plus, Trash2, Copy, Edit, Percent } from 'lucide-react';
import { toast } from 'sonner';

export function DiscountPresets() {
  const { user } = useAuth();
  const { invalidatePresets } = useCacheManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<DiscountPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'price',
    value: 0,
  });

  const { data: presets, isLoading, refetch } = useDiscountPresets(user?.id, !!user?.id);

  const createMutation = useMutation({
    mutationFn: (data: Partial<DiscountPreset>) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return createDiscountPreset(user.id, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Discount preset created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create preset');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: Partial<DiscountPreset> }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return updateDiscountPreset(user.id, presetId, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Discount preset updated successfully');
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return deleteDiscountPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Discount preset deleted successfully');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return duplicateDiscountPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Discount preset duplicated successfully');
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData({
      name: '',
      type: 'percentage',
      value: 0,
    });
  };

  const handleOpenEditDialog = (preset: DiscountPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      type: preset.type,
      value: preset.value,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (formData.value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    if (formData.type === 'percentage' && formData.value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
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
          <h2 className="text-xl sm:text-2xl font-bold">Discount Presets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Create reusable discount configurations
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
                {editingPreset ? 'Edit Discount Preset' : 'Create Discount Preset'}
              </DialogTitle>
              <DialogDescription>
                Define a discount that can be applied to tours
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Preset Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Early Bird 20%, Summer Sale"
                />
              </div>

              <div>
                <Label>Discount Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'percentage' | 'price') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="price">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                </Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                  }
                  placeholder={formData.type === 'percentage' ? '20' : '100'}
                  max={formData.type === 'percentage' ? 100 : undefined}
                />
              </div>
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
                {preset.type === 'percentage'
                  ? `${preset.value}% off`
                  : `$${preset.value} off`}
              </CardDescription>
            </CardHeader>

            {/* Content in middle */}
            <CardContent className="flex-1 flex flex-col pt-0">
              <div className="flex items-center justify-center py-6 flex-1">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {preset.type === 'percentage' ? `${preset.value}%` : `$${preset.value}`}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {preset.type === 'percentage' ? 'Percentage Off' : 'Fixed Amount Off'}
                  </div>
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
            <Percent className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No discount presets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create discount presets to quickly apply promotions to your tours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
