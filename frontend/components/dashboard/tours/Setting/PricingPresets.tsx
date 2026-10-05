'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, usePricingPresets } from '@/lib/queries';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createPricingPreset,
  updatePricingPreset,
  deletePricingPreset,
  duplicatePricingPreset,
  PricingOptionPreset,
  PricingOption
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
import { Plus, Trash2, Copy, Edit, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { apiErrorMessage } from '@/lib/api/apiClient';

export function PricingPresets() {
  const { user } = useAuth();
  const { invalidatePresets } = useCacheManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PricingOptionPreset | null>(null);
  const [presetName, setPresetName] = useState('');
  const [pricingOptions, setPricingOptions] = useState<Partial<PricingOption>[]>([
    {
      name: 'Adult',
      category: 'adult',
      basePrice: 0,
      discountEnabled: false,
      paxRange: { min: 1, max: 50 },
      isActive: true,
    },
  ]);

  const { data: presets, isLoading, refetch } = usePricingPresets(user?.id ?? undefined, !!user?.id);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<PricingOptionPreset>) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return createPricingPreset(user.id, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pricing preset created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to create preset'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: Partial<PricingOptionPreset> }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return updatePricingPreset(user.id, presetId, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pricing preset updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to update preset'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return deletePricingPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pricing preset deleted successfully');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to delete preset'));
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return duplicatePricingPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Pricing preset duplicated successfully');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to duplicate preset'));
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setPresetName('');
    setPricingOptions([
      {
        name: 'Adult',
        category: 'adult',
        basePrice: 0,
        discountEnabled: false,
        paxRange: { min: 1, max: 50 },
        isActive: true,
      },
    ]);
  };

  const handleOpenEditDialog = (preset: PricingOptionPreset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPricingOptions(preset.options);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (pricingOptions.length === 0) {
      toast.error('Please add at least one pricing option');
      return;
    }

    const data = {
      name: presetName,
      options: pricingOptions as PricingOption[],
    };

    if (editingPreset) {
      updateMutation.mutate({ presetId: editingPreset.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddOption = () => {
    setPricingOptions([
      ...pricingOptions,
      {
        name: 'Option ' + (pricingOptions.length + 1),
        category: 'adult',
        basePrice: 0,
        discountEnabled: false,
        paxRange: { min: 1, max: 50 },
        isActive: true,
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    setPricingOptions(pricingOptions.filter((_, i) => i !== index));
  };

  const handleOptionChange = <K extends keyof PricingOption>(index: number, field: K, value: PricingOption[K]) => {
    setPricingOptions(pricingOptions.map((option, i) => (i === index ? { ...option, [field]: value } : option)));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Pricing Presets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Create reusable pricing options for your tours
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPreset ? 'Edit Pricing Preset' : 'Create Pricing Preset'}
              </DialogTitle>
              <DialogDescription>
                Define pricing options that you can reuse across multiple tours
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="preset-name">Preset Name</Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., Age Groups, Seasonal Pricing"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Pricing Options</Label>
                  <Button variant="outline" size="sm" onClick={handleAddOption}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                </div>

                {pricingOptions.map((option, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="flex-1 space-y-4 w-full">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Name</Label>
                              <Input
                                value={option.name || ''}
                                onChange={(e) =>
                                  handleOptionChange(index, 'name', e.target.value)
                                }
                                placeholder="e.g., Adult"
                              />
                            </div>
                            <div>
                              <Label>Category</Label>
                              <Select
                                value={option.category || 'adult'}
                                onValueChange={(value) =>
                                  handleOptionChange(index, 'category', value as PricingOption['category'])
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="adult">Adult</SelectItem>
                                  <SelectItem value="child">Child</SelectItem>
                                  <SelectItem value="senior">Senior</SelectItem>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Base Price (Optional)</Label>
                              <Input
                                type="number"
                                value={option.basePrice || 0}
                                onChange={(e) =>
                                  handleOptionChange(
                                    index,
                                    'basePrice',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-0 sm:pt-8">
                              <Switch
                                checked={option.isActive !== false}
                                onCheckedChange={(checked) =>
                                  handleOptionChange(index, 'isActive', checked)
                                }
                              />
                              <Label>Active</Label>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Min Pax</Label>
                              <Input
                                type="number"
                                value={option.paxRange?.min || 1}
                                onChange={(e) =>
                                  handleOptionChange(index, 'paxRange', {
                                    min: parseInt(e.target.value) || 1,
                                    max: option.paxRange?.max || 50,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Max Pax</Label>
                              <Input
                                type="number"
                                value={option.paxRange?.max || 50}
                                onChange={(e) =>
                                  handleOptionChange(index, 'paxRange', {
                                    min: option.paxRange?.min || 1,
                                    max: parseInt(e.target.value) || 50,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                          disabled={pricingOptions.length === 1}
                          className="self-start sm:self-auto shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : 'Save Preset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Presets Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {presets?.map((preset) => (
          <Card key={preset.id} className="flex flex-col hover:shadow-md transition-shadow">
            {/* Title at top */}
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg truncate">{preset.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {preset.options.length} option{preset.options.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>

            {/* Content in middle */}
            <CardContent className="flex-1 flex flex-col pt-0">
              <div className="space-y-2 flex-1">
                {preset.options.map((option, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm p-2.5 bg-muted/50 rounded-md border border-border/50"
                  >
                    <span className="font-medium truncate">{option.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {option.category} • {option.paxRange.min}-{option.paxRange.max} pax
                    </span>
                  </div>
                ))}
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
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pricing presets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create your first pricing preset to save time when creating tours. You can
              define age groups, seasonal pricing, or any custom pricing structure.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
