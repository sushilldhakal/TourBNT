/**
 * BulkActionsPanel Component
 * 
 * Provides bulk operations for multiple selected items.
 * Displays selected count and bulk action buttons.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use client';

import React, { useState } from 'react';
import { BulkActionsPanelProps } from './types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Icon from '@/components/Icon';

export function BulkActionsPanel({
    selectedCount,
    onBulkDelete,
    onClearSelection,
    isDeleting,
}: BulkActionsPanelProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    /**
     * Handle bulk delete button click
     * Shows confirmation on first click, executes on second click
     */
    const handleBulkDelete = () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }
        onBulkDelete();
        setShowDeleteConfirm(false);
    };

    /**
     * Handle clear selection button click
     */
    const handleClearSelection = () => {
        onClearSelection();
        setShowDeleteConfirm(false);
    };

    /**
     * Cancel delete confirmation
     */
    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <div className="h-full flex flex-col bg-background border-l">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Icon name="lu:LuCheckSquare" size={20} className="text-primary" />
                    <h2 className="text-lg font-semibold">Bulk Actions</h2>
                </div>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleClearSelection}
                    aria-label="Clear selection"
                    disabled={isDeleting}
                >
                    <Icon name="lu:LuX" size={20} />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-6">
                {/* Selection Count */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Selected Items
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                            <span className="text-xl font-bold">{selectedCount}</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Ready for bulk operations
                            </p>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Actions
                        </label>
                        <div className="space-y-2">
                            {/* Clear Selection Button */}
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={handleClearSelection}
                                disabled={isDeleting}
                                aria-label={`Clear selection of ${selectedCount} items`}
                            >
                                <Icon name="lu:LuXCircle" size={16} className="mr-2" aria-hidden="true" />
                                Clear Selection
                            </Button>

                            {/* Bulk Delete Button */}
                            <Button
                                variant={showDeleteConfirm ? 'destructive' : 'outline'}
                                className={cn(
                                    'w-full justify-start',
                                    showDeleteConfirm && 'text-destructive-foreground'
                                )}
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                aria-label={
                                    isDeleting
                                        ? `Deleting ${selectedCount} items`
                                        : showDeleteConfirm
                                            ? `Confirm deletion of ${selectedCount} items`
                                            : `Delete ${selectedCount} selected items`
                                }
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="animate-spin mr-2" aria-hidden="true">
                                            <Icon name="lu:LuLoader2" size={16} />
                                        </div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="lu:LuTrash2" size={16} className="mr-2" aria-hidden="true" />
                                        {showDeleteConfirm
                                            ? `Delete ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'}?`
                                            : 'Delete Selected'}
                                    </>
                                )}
                            </Button>

                            {/* Cancel delete confirmation */}
                            {showDeleteConfirm && !isDeleting && (
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={handleCancelDelete}
                                    aria-label="Cancel bulk deletion"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Warning message when delete confirmation is shown */}
                    {showDeleteConfirm && !isDeleting && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <div className="flex gap-2">
                                <Icon
                                    name="lu:LuAlertTriangle"
                                    size={16}
                                    className="text-destructive mt-0.5 flex-shrink-0"
                                />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-destructive">
                                        Confirm Deletion
                                    </p>
                                    <p className="text-xs text-destructive/80">
                                        This action cannot be undone. {selectedCount} {selectedCount === 1 ? 'item' : 'items'} will be permanently deleted.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading state message */}
                    {isDeleting && (
                        <div className="p-3 bg-muted rounded-lg">
                            <div className="flex gap-2">
                                <div className="animate-spin mt-0.5">
                                    <Icon name="lu:LuLoader2" size={16} className="text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        Deleting items...
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Please wait while we delete {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Info section */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                        Tips
                    </label>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex gap-2">
                            <Icon name="lu:LuInfo" size={14} className="mt-0.5 flex-shrink-0" />
                            <p>
                                Hold Ctrl/Cmd while clicking to select multiple items
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Icon name="lu:LuInfo" size={14} className="mt-0.5 flex-shrink-0" />
                            <p>
                                Click the checkbox on items to add them to selection
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Icon name="lu:LuInfo" size={14} className="mt-0.5 flex-shrink-0" />
                            <p>
                                Switching tabs will clear your current selection
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
