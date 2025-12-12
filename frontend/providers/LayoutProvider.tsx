'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
    isFullWidth: boolean;
    toggleLayout: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [isFullWidth, setIsFullWidth] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('layout-full-width');
        if (saved !== null) {
            setIsFullWidth(saved === 'true');
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
