import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface User {
    id: string | null;
    roles: string; // Server returns single role as string
    email: string | null;
    name?: string;
    avatar?: string;
    phone?: string;
    verified?: boolean;
    sellerStatus?: string;
}

interface UserStore {
    user: User;
    isHydrated: boolean;
    setUser: (user: User) => void;
    clearUser: () => void;
    setHydrated: () => void;
}

const defaultUser: User = {
    id: null,
    roles: '',
    email: null,
    name: undefined,
    avatar: undefined,
    phone: undefined,
    verified: undefined,
    sellerStatus: undefined,
};

const defaultState = {
    user: defaultUser,
    isHydrated: false,
};

const useUserStore = create<UserStore>()(
    subscribeWithSelector((set) => ({
        ...defaultState,
        setUser: (user) => set({ user, isHydrated: true }),
        clearUser: () =>
            set({
                user: defaultUser,
                isHydrated: true,
            }),
        setHydrated: () => set({ isHydrated: true }),
    }))
);

export default useUserStore;
