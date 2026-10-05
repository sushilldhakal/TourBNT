'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useContentPresets } from '@/lib/queries';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  createContentPreset,
  updateContentPreset,
  deleteContentPreset,
  duplicateContentPreset,
  ContentPreset,
} from '@/lib/api/tourSettingsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Copy, Edit, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api/apiClient';

const CONTENT_TYPES = [
  { value: 'description', label: 'Description' },
  { value: 'include', label: 'Includes' },
  { value: 'exclude', label: 'Excludes' },
  { value: 'outline', label: 'Outline' },
] as const;

export function ContentPresets() {
  const { user } = useAuth();
  const { invalidatePresets } = useCacheManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ContentPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contentType: 'description' as 'description' | 'include' | 'exclude' | 'outline',
    content: '',
  });

  const { data: presets, isLoading, refetch } = useContentPresets(user?.id ?? undefined, !!user?.id);

  const createMutation = useMutation({
    mutationFn: (data: Partial<ContentPreset>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return createContentPreset(user.id, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Content preset created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to create preset'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: Partial<ContentPreset> }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateContentPreset(user.id, presetId, data);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Content preset updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to update preset'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return deleteContentPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Content preset deleted successfully');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to delete preset'));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (presetId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return duplicateContentPreset(user.id, presetId);
    },
    onSuccess: () => {
      invalidatePresets(user?.id ?? null);
      refetch();
      toast.success('Content preset duplicated successfully');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to duplicate preset'));
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPreset(null);
    setFormData({ name: '', contentType: 'description', content: '' });
  };

  const handleOpenEditDialog = (preset: ContentPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      contentType: preset.contentType || 'description',
      content: typeof preset.content === 'string' ? preset.content : JSON.stringify(preset.content, null, 2),
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
      contentType: formData.contentType,
      content: formData.content,
    };
    if (editingPreset) {
      updateMutation.mutate({ presetId: editingPreset._id || editingPreset.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const presetId = (p: ContentPreset) => p._id || p.id;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Content Presets</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Reusable description, include, exclude, or outline templates
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
                {editingPreset ? 'Edit Content Preset' : 'Create Content Preset'}
              </DialogTitle>
              <DialogDescription>
                Define a reusable content template (description, includes, excludes, or outline)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Preset Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Tour Description"
                />
              </div>

              <div>
                <Label>Content Type</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(v: 'description' | 'include' | 'exclude' | 'outline') =>
                    setFormData({ ...formData, contentType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter your template content..."
                  rows={6}
                  className="resize-y"
                />
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
              <CardDescription className="text-xs sm:text-sm capitalize">
                {preset.contentType}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              <p className="font-medium text-base truncate">{preset.name}</p>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {typeof preset.content === 'string'
                  ? preset.content
                  : JSON.stringify(preset.content).slice(0, 80) + '...'}
              </p>
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
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No content presets yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create content presets to quickly populate tour descriptions, includes, excludes, or outlines.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
