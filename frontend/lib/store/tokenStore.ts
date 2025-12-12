import { create } from 'zustand';
import Cookies from 'js-cookie';

interface TokenStore {
    token: string | null;
    setToken: (token: string) => void;
    clearToken: () => void;
    getToken: () => string | null;
}

const useTokenStore = create<TokenStore>((set, get) => ({
    token: typeof window !== 'undefined' ? Cookies.get('token') || null : null,

    setToken: (token: string) => {
        set({ token });
        // Store in cookie (accessible by both frontend and dashboard)
        if (typeof window !== 'undefined') {
            Cookies.set('token', token, {
                expires: 7, // 7 days
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            });
        }
    },

    clearToken: () => {
        set({ token: null });
        if (typeof window !== 'undefined') {
            Cookies.remove('token', { path: '/' });
        }
    },

    getToken: () => {
        const state = get();
        if (state.token) return state.token;

        // Fallback to cookie if state is empty
        if (typeof window !== 'undefined') {
            const cookieToken = Cookies.get('token');
            if (cookieToken) {
                set({ token: cookieToken });
                return cookieToken;
            }
        }
        return null;
    },
}));

export default useTokenStore;
