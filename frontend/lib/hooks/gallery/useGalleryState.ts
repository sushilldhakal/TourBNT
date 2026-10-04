/**
 * useGalleryState Hook
 *
 * Manages UI state for the gallery including tabs, view mode, selections, and upload status.
 * Handles persistence of view mode across sessions and provides centralized state management.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface GalleryState {
    activeTab: 'images' | 'videos' | 'pdfs';
    viewMode: 'list' | 'masonry';
    selectedIds: Set<string>;
    isUploading: boolean;
}

interface UseGalleryStateOptions {
    mode?: 'standalone' | 'picker';
    initialTab?: 'images' | 'videos' | 'pdfs';
    initialViewMode?: 'list' | 'masonry';
    persistViewMode?: boolean;
    syncWithUrl?: boolean;
}

const VIEW_MODE_STORAGE_KEY = 'gallery-view-mode';

export function useGalleryState(options: UseGalleryStateOptions = {}) {
    const {
        mode = 'standalone',
        initialTab = 'images',
        initialViewMode = 'masonry',
        persistViewMode = true,
        syncWithUrl = true,
    } = options;

    const router = useRouter();
    const searchParams = useSearchParams();

    type Tab = GalleryState['activeTab'];
    const isTab = (value: string | null): value is Tab => value === 'images' || value === 'videos' || value === 'pdfs';
    // On the standalone gallery page the tab lives in the URL (?tab=), so links and the back button work.
    const urlSynced = mode === 'standalone' && syncWithUrl;
    const tabParam = searchParams.get('tab');
    const urlTab = urlSynced && isTab(tabParam) ? tabParam : null;

    const getInitialViewMode = useCallback((): 'list' | 'masonry' => {
        if (persistViewMode && typeof window !== 'undefined') {
            const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
            if (saved === 'list' || saved === 'masonry') return saved;
        }
        return initialViewMode;
    }, [persistViewMode, initialViewMode]);

    const [state, setState] = useState<GalleryState>(() => ({
        activeTab: initialTab,
        viewMode: getInitialViewMode(),
        selectedIds: new Set<string>(),
        isUploading: false,
    }));
    const activeTab = urlTab ?? state.activeTab;

    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // A tab change from the URL (back/forward) clears the selection, like one from setActiveTab.
    const [seenUrlTab, setSeenUrlTab] = useState(urlTab);
    if (urlTab !== seenUrlTab) {
        setSeenUrlTab(urlTab);
        setState((prev) => ({ ...prev, selectedIds: new Set<string>() }));
    }

    useEffect(() => {
        if (persistViewMode && typeof window !== 'undefined') {
            localStorage.setItem(VIEW_MODE_STORAGE_KEY, state.viewMode);
        }
    }, [state.viewMode, persistViewMode]);

    const setActiveTab = useCallback((tab: Tab) => {
        setState((prev) => ({ ...prev, activeTab: tab, selectedIds: new Set<string>() }));
        if (urlSynced) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', tab);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [urlSynced, searchParams, router]);

    const setViewMode = useCallback((viewMode: 'list' | 'masonry') => {
        setState((prev) => ({ ...prev, viewMode }));
    }, []);

    const toggleViewMode = useCallback(() => {
        setState((prev) => ({ ...prev, viewMode: prev.viewMode === 'list' ? 'masonry' : 'list' }));
    }, []);

    const selectItem = useCallback((id: string, isMultiSelect: boolean = false) => {
        setState((prev) => {
            const newSelected = new Set(prev.selectedIds);
            if (isMultiSelect) {
                if (newSelected.has(id)) newSelected.delete(id);
                else newSelected.add(id);
                setLastSelectedId(id);
            } else {
                if (newSelected.has(id) && newSelected.size === 1) {
                    newSelected.clear();
                    setLastSelectedId(null);
                } else {
                    newSelected.clear();
                    newSelected.add(id);
                    setLastSelectedId(id);
                }
            }
            return { ...prev, selectedIds: newSelected };
        });
    }, []);

    const selectRange = useCallback((startId: string, endId: string, allItemIds: string[]) => {
        const startIndex = allItemIds.indexOf(startId);
        const endIndex = allItemIds.indexOf(endId);
        if (startIndex === -1 || endIndex === -1) return;
        const [begin, end] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const rangeIds = allItemIds.slice(begin, end + 1);
        setState((prev) => ({ ...prev, selectedIds: new Set([...prev.selectedIds, ...rangeIds]) }));
        setLastSelectedId(endId);
    }, []);

    const selectItems = useCallback((ids: string[]) => {
        setState((prev) => ({ ...prev, selectedIds: new Set([...prev.selectedIds, ...ids]) }));
    }, []);

    const deselectItem = useCallback((id: string) => {
        setState((prev) => {
            const newSelected = new Set(prev.selectedIds);
            newSelected.delete(id);
            return { ...prev, selectedIds: newSelected };
        });
    }, []);

    const clearSelection = useCallback(() => {
        setState((prev) => ({ ...prev, selectedIds: new Set<string>() }));
        setLastSelectedId(null);
    }, []);

    const selectAll = useCallback((itemIds: string[]) => {
        setState((prev) => ({ ...prev, selectedIds: new Set(itemIds) }));
    }, []);

    const setUploading = useCallback((isUploading: boolean) => {
        setState((prev) => ({ ...prev, isUploading }));
    }, []);

    const reset = useCallback(() => {
        setState({
            activeTab: initialTab,
            viewMode: getInitialViewMode(),
            selectedIds: new Set<string>(),
            isUploading: false,
        });
    }, [initialTab, getInitialViewMode]);

    const hasSelection = state.selectedIds.size > 0;
    const selectionCount = state.selectedIds.size;
    const selectedArray = Array.from(state.selectedIds);

    return {
        activeTab,
        viewMode: state.viewMode,
        selectedIds: state.selectedIds,
        isUploading: state.isUploading,
        lastSelectedId,
        hasSelection,
        selectionCount,
        selectedArray,
        setActiveTab,
        setViewMode,
        toggleViewMode,
        selectItem,
        selectRange,
        selectItems,
        deselectItem,
        clearSelection,
        selectAll,
        setUploading,
        reset,
        isSelected: (id: string) => state.selectedIds.has(id),
        isTabActive: (tab: string) => activeTab === tab,
        isViewMode: (mode: string) => state.viewMode === mode,
    };
}

export function useViewMode(initialMode: 'list' | 'masonry' = 'masonry') {
    const [viewMode, setViewMode] = useState<'list' | 'masonry'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
            if (saved === 'list' || saved === 'masonry') return saved;
        }
        return initialMode;
    });

    const updateViewMode = useCallback((mode: 'list' | 'masonry') => {
        setViewMode(mode);
        if (typeof window !== 'undefined') localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }, []);

    const toggleViewMode = useCallback(() => {
        updateViewMode(viewMode === 'list' ? 'masonry' : 'list');
    }, [viewMode, updateViewMode]);

    return {
        viewMode,
        setViewMode: updateViewMode,
        toggleViewMode,
        isList: viewMode === 'list',
        isMasonry: viewMode === 'masonry',
    };
}
