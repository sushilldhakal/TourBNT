'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';

interface TuiImageEditorProps {
    source: string;
    onSave: (editedImageObject: any) => void;
    onClose: () => void;
}

const TuiImageEditor = ({ source, onSave, onClose }: TuiImageEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTuiEditor = async () => {
            try {
                console.log('🔄 Starting to load TUI Image Editor...');

                // Add a timeout to prevent infinite loading
                const timeoutId = setTimeout(() => {
                    console.error('❌ TUI Image Editor loading timeout');
                    setError('Image editor loading timeout - falling back to simple editor');
                    setIsLoading(false);
                }, 10000); // 10 second timeout

                // Dynamic import to avoid SSR issues
                console.log('📦 Importing tui-image-editor module...');
                const tuiModule = await import('tui-image-editor');
                console.log('✅ TUI module imported:', tuiModule);

                const ImageEditor = tuiModule.default;

                if (!ImageEditor) {
                    throw new Error('TUI Image Editor default export not found');
                }

                if (!editorRef.current) {
                    throw new Error('Editor container ref not available');
                }

                console.log('🎨 Initializing TUI Image Editor...');

                // Initialize TUI Image Editor with minimal config first
                const editorInstance = new ImageEditor(editorRef.current, {
                    includeUI: {
                        loadImage: {
                            path: source,
                            name: 'image'
                        },
                        menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'text', 'filter'],
                        initMenu: 'crop',
                        uiSize: {
                            width: '100%',
                            height: '600px'
                        },
                        menuBarPosition: 'bottom'
                    },
                    cssMaxWidth: 1000,
                    cssMaxHeight: 600,
                    usageStatistics: false
                });

                clearTimeout(timeoutId);
                setEditor(editorInstance);
                setIsLoading(false);

                console.log('✅ TUI Image Editor initialized successfully!');
            } catch (error) {
                console.error('❌ Failed to load TUI Image Editor:', error);
                setError(`Failed to load image editor: ${error.message}`);
                setIsLoading(false);
            }
        };

        loadTuiEditor();

        // Cleanup
        return () => {
            if (editor) {
                editor.destroy();
            }
        };
    }, [source]);

    const handleSave = () => {
        if (!editor) return;

        try {
            const imageData = editor.toDataURL();
            onSave({
                imageBase64: imageData,
                quality: 0.9,
                mimeType: 'image/png'
            });
        } catch (error) {
            console.error('Error saving image:', error);
        }
    };

    const handleReset = () => {
        if (!editor) return;

        try {
            editor.loadImageFromURL(source, 'image');
        } catch (error) {
            console.error('Error resetting image:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading TUI Image Editor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        // Auto-fallback to SimpleImageEditor
        const SimpleImageEditor = dynamic(
            () => import('./SimpleImageEditor'),
            {
                ssr: false,
                loading: () => (
                    <div className="flex items-center justify-center h-[600px] w-full">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p>Loading fallback editor...</p>
                        </div>
                    </div>
                ),
            }
        );

        return (
            <div className="relative">
                <div className="absolute top-4 left-4 z-10">
                    <div className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 border border-yellow-200 rounded shadow-sm">
                        Simple Editor (TUI Failed)
                    </div>
                </div>
                <SimpleImageEditor source={source} onSave={onSave} onClose={onClose} />
            </div>
        );
    }

    return (
        <div className="relative w-full h-[600px] bg-background">
            {/* Header with controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="px-2 py-1 text-xs bg-green-100 text-green-800 border border-green-200 rounded shadow-sm">
                        TUI Image Editor
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <Icon name="lu:LuRotateCcw" size={14} className="mr-1" />
                        Reset
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                        <Icon name="lu:LuCheck" size={14} className="mr-1" />
                        Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        <Icon name="lu:LuX" size={14} className="mr-1" />
                        Close
                    </Button>
                </div>
            </div>

            {/* TUI Image Editor Container */}
            <div
                ref={editorRef}
                className="w-full h-full"
                style={{ paddingTop: '60px' }}
            />
        </div>
    );
};

export default TuiImageEditor;