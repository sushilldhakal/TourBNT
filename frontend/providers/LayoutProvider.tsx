'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
    isFullWidth: boolean;
    toggleLayout: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    // Always start with false so server and first client paint match (avoids hydration mismatch).
    // Apply saved preference after mount so we never read localStorage during initial render.
    const [isFullWidth, setIsFullWidth] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('layout-full-width');
        if (saved === 'true') {
            const id = setTimeout(() => setIsFullWidth(true), 0);
            return () => clearTimeout(id);
        }
    }, []);

    const toggleLayout = () => {
        setIsFullWidth((prev) => {
            const newValue = !prev;
            localStorage.setItem('layout-full-width', String(newValue));
            return newValue;
        });
    };

    return (
        <LayoutContext.Provider value={{ isFullWidth, toggleLayout }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
