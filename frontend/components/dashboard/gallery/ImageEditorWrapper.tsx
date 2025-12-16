'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

interface ImageEditorWrapperProps {
    source: string;
    onSave: (editedImageObject: any) => void;
    onClose: () => void;
}

// TUI Image Editor following proper Next.js pattern
const TuiImageEditorProper = dynamic(
    () => import('./TuiImageEditorProper'),
    {
        ssr: false, // This is crucial for TUI Image Editor
        loading: () => (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Loading TUI Image Editor</p>
                    <p className="text-sm text-muted-foreground mt-2">Please wait...</p>
                </div>
            </div>
        ),
    }
);

const SimpleImageEditor = dynamic(
    () => import('./SimpleImageEditor'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading simple editor...</p>
                </div>
            </div>
        ),
    }
);

export default function ImageEditorWrapper({ source, onSave, onClose }: ImageEditorWrapperProps) {
    const [useFallback, setUseFallback] = useState(false);

    // If TUI fails, automatically switch to simple editor
    if (useFallback) {
        return (
            <div className="relative">
                <div className="absolute top-4 left-4 z-10">
                    <div className="px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded shadow-sm">
                        Simple Editor (TUI Fallback)
                    </div>
                </div>
                <SimpleImageEditor source={source} onSave={onSave} onClose={onClose} />
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Add manual fallback button */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => setUseFallback(true)}
                    className="px-3 py-1 text-xs bg-white/90 hover:bg-white border rounded shadow-sm"
                >
                    Use Simple Editor
                </button>
            </div>

            <TuiImageEditorProper
                source={source}
                onSave={onSave}
                onClose={onClose}
            />
        </div>
    );
}