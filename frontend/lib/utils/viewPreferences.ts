export type ViewMode = 'list' | 'grid';

/**
 * Get the saved view preference for a specific page
 * @param page - The page identifier (e.g., 'destinations', 'categories')
 * @returns The saved view mode or 'list' as default
 */
export function getViewPreference(page: string): ViewMode {
    try {
        const stored = localStorage.getItem(`dashboard-view-${page}`);

        // Validate that the stored value is a valid ViewMode
        if (stored === 'list' || stored === 'grid') {
            return stored;
        }

        // If invalid or not found, return default
        return 'list';
    } catch (error) {
        // localStorage might be unavailable (private browsing, disabled, etc.)
        console.warn('localStorage unavailable, using default view:', error);
        return 'list';
    }
}

/**
 * Save the view preference for a specific page
 * @param page - The page identifier (e.g., 'destinations', 'categories')
 * @param view - The view mode to save
 */
export function setViewPreference(page: string, view: ViewMode): void {
    try {
        localStorage.setItem(`dashboard-view-${page}`, view);
    } catch (error) {
        // localStorage might be unavailable or quota exceeded
        console.warn('Failed to save view preference:', error);
        // Continue without saving - user experience not blocked
    }
}
