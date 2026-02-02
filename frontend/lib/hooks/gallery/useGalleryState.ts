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

    const getInitialTab = useCallback((): 'images' | 'videos' | 'pdfs' => {
        if (mode === 'picker') return initialTab;
        if (syncWithUrl) {
            const tabParam = searchParams.get('tab');
            if (tabParam === 'images' || tabParam === 'videos' || tabParam === 'pdfs') return tabParam;
        }
        return initialTab;
    }, [mode, initialTab, syncWithUrl, searchParams]);

    const getInitialViewMode = useCallback((): 'list' | 'masonry' => {
        if (persistViewMode && typeof window !== 'undefined') {
            const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
            if (saved === 'list' || saved === 'masonry') return saved;
        }
        return initialViewMode;
    }, [persistViewMode, initialViewMode]);

    const [state, setState] = useState<GalleryState>({
        activeTab: getInitialTab(),
        viewMode: getInitialViewMode(),
        selectedIds: new Set<string>(),
        isUploading: false,
    });

    const [isUpdatingFromUrl, setIsUpdatingFromUrl] = useState(false);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (mode !== 'standalone' || !syncWithUrl || isUpdatingFromUrl) return;
        const currentTab = searchParams.get('tab');
        if (currentTab !== state.activeTab) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', state.activeTab);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [state.activeTab, mode, syncWithUrl, router, searchParams, isUpdatingFromUrl]);

    useEffect(() => {
        if (mode !== 'standalone' || !syncWithUrl) return;
        const tabParam = searchParams.get('tab');
        if (tabParam && (tabParam === 'images' || tabParam === 'videos' || tabParam === 'pdfs')) {
            if (tabParam !== state.activeTab) {
                setIsUpdatingFromUrl(true);
                setState((prev) => ({ ...prev, activeTab: tabParam, selectedIds: new Set<string>() }));
                setTimeout(() => setIsUpdatingFromUrl(false), 0);
            }
        }
    }, [searchParams, mode, syncWithUrl]);

    useEffect(() => {
        if (persistViewMode && typeof window !== 'undefined') {
            localStorage.setItem(VIEW_MODE_STORAGE_KEY, state.viewMode);
        }
    }, [state.viewMode, persistViewMode]);

    const setActiveTab = useCallback((tab: 'images' | 'videos' | 'pdfs') => {
        setState((prev) => ({ ...prev, activeTab: tab, selectedIds: new Set<string>() }));
    }, []);

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
            activeTab: getInitialTab(),
            viewMode: getInitialViewMode(),
            selectedIds: new Set<string>(),
            isUploading: false,
        });
    }, [getInitialTab, getInitialViewMode]);

    const hasSelection = state.selectedIds.size > 0;
    const selectionCount = state.selectedIds.size;
    const selectedArray = Array.from(state.selectedIds);

    return {
        activeTab: state.activeTab,
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
        isTabActive: (tab: string) => state.activeTab === tab,
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
