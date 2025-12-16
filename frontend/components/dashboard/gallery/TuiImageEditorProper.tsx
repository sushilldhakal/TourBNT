'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';

interface TuiImageEditorProperProps {
    source: string;
    onSave: (editedImageObject: any) => void;
    onClose: () => void;
}

const TuiImageEditorProper = ({ source, onSave, onClose }: TuiImageEditorProperProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeEditor = async () => {
            try {
                // Dynamic import of TUI Image Editor
                const { default: ImageEditor } = await import('tui-image-editor');

                // Import CSS
                await import('tui-image-editor/dist/tui-image-editor.css');

                if (editorRef.current && !editorInstance.current) {
                    console.log('🎨 Initializing TUI Image Editor with source:', source);

                    editorInstance.current = new ImageEditor(editorRef.current, {
                        includeUI: {
                            loadImage: {
                                path: source,
                                name: 'EditableImage',
                            },
                            initMenu: 'crop',
                            menuBarPosition: 'bottom',
                            uiSize: {
                                width: '100%',
                                height: '500px'
                            }
                        },
                        cssMaxWidth: 1000,
                        cssMaxHeight: 500,
                        usageStatistics: false,
                    });

                    // Handle window resize
                    const resizeHandler = () => {
                        if (editorInstance.current && editorInstance.current.ui) {
                            editorInstance.current.ui.resizeEditor();
                        }
                    };

                    window.addEventListener('resize', resizeHandler);

                    console.log('✅ TUI Image Editor initialized successfully');
                    setIsLoading(false);

                    // Cleanup function
                    return () => {
                        window.removeEventListener('resize', resizeHandler);
                    };
                }
            } catch (error: any) {
                console.error('❌ Failed to initialize TUI Image Editor:', error);
                setError(`Failed to load image editor: ${error.message}`);
                setIsLoading(false);
            }
        };

        initializeEditor();

        // Cleanup on unmount
        return () => {
            if (editorInstance.current) {
                try {
                    editorInstance.current.destroy();
                    editorInstance.current = null;
                } catch (e) {
                    console.warn('Error destroying editor:', e);
                }
            }
        };
    }, [source]);

    const handleSave = () => {
        if (editorInstance.current) {
            try {
                const imageData = editorInstance.current.toDataURL();
                onSave({
                    imageBase64: imageData,
                    quality: 0.9,
                    mimeType: 'image/png'
                });
            } catch (error) {
                console.error('Error saving image:', error);
            }
        }
    };

    const handleReset = () => {
        if (editorInstance.current) {
            try {
                editorInstance.current.loadImageFromURL(source, 'ResetImage');
            } catch (error) {
                console.error('Error resetting image:', error);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Loading TUI Image Editor</p>
                    <p className="text-sm text-muted-foreground mt-2">Initializing canvas and tools...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <Icon name="lu:LuAlertCircle" size={48} className="mx-auto mb-4 text-red-500" />
                    <p className="text-lg font-medium text-red-600 mb-2">TUI Image Editor Failed</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
                    <div className="space-y-2">
                        <Button onClick={() => window.location.reload()} variant="outline">
                            Retry Loading
                        </Button>
                        <Button onClick={onClose}>
                            Close Editor
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[600px] bg-background">
            {/* Header with controls */}
            <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 text-sm bg-green-100 text-green-800 border border-green-200 rounded-md font-medium">
                        🎨 TUI Image Editor
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <Icon name="lu:LuRotateCcw" size={16} className="mr-2" />
                        Reset
                    </Button>
                    <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                        <Icon name="lu:LuCheck" size={16} className="mr-2" />
                        Save Changes
                    </Button>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        <Icon name="lu:LuX" size={16} className="mr-2" />
                        Close
                    </Button>
                </div>
            </div>

            {/* TUI Image Editor Container */}
            <div
                ref={editorRef}
                id="tui-image-editor-container"
                className="w-full h-full"
                style={{
                    paddingTop: '80px',
                    minHeight: '500px'
                }}
            />
        </div>
    );
};

export default TuiImageEditorProper;