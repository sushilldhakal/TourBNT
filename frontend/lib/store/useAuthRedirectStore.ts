import { create } from 'zustand';

interface AuthRedirectStore {
    shouldRedirectToLogin: boolean;
    redirectPath: string | null;
    setRedirectToLogin: (path?: string) => void;
    clearRedirect: () => void;
}

export const useAuthRedirectStore = create<AuthRedirectStore>((set) => ({
    shouldRedirectToLogin: false,
    redirectPath: null,
    setRedirectToLogin: (path?: string) => {
        const currentPath = typeof window !== 'undefined' 
            ? window.location.pathname + window.location.search 
            : '/';
        set({
            shouldRedirectToLogin: true,
            redirectPath: path || currentPath,
        });
    },
    clearRedirect: () => {
        set({
            shouldRedirectToLogin: false,
            redirectPath: null,
        });
    },
}));
