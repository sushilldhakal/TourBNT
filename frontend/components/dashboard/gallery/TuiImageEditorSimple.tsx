'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';
import '../../styles/tui-image-editor.css';

interface TuiImageEditorSimpleProps {
    source: string;
    onSave: (editedImageObject: any) => void;
    onClose: () => void;
}

const TuiImageEditorSimple = ({ source, onSave, onClose }: TuiImageEditorSimpleProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingStep, setLoadingStep] = useState('Initializing...');

    useEffect(() => {
        const loadTuiEditor = async () => {
            try {
                setLoadingStep('Loading TUI Image Editor module...');
                console.log('🔄 Starting TUI Image Editor load process');

                // Check if we're in the browser
                if (typeof window === 'undefined') {
                    throw new Error('TUI Image Editor requires browser environment');
                }

                // Import the module
                setLoadingStep('Importing module...');
                const tuiModule = await import('tui-image-editor');
                console.log('📦 TUI module loaded:', tuiModule);

                // Check if the module has the expected structure
                if (!tuiModule || !tuiModule.default) {
                    console.error('❌ TUI module structure:', tuiModule);
                    throw new Error('TUI Image Editor module not properly exported');
                }

                const ImageEditor = tuiModule.default;
                console.log('🎨 ImageEditor constructor:', ImageEditor);

                if (!editorRef.current) {
                    throw new Error('Editor container not ready');
                }

                setLoadingStep('Creating editor instance...');

                // Create editor with minimal configuration
                const editorInstance = new ImageEditor(editorRef.current, {
                    includeUI: {
                        loadImage: {
                            path: source,
                            name: 'EditedImage'
                        },
                        menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'text'],
                        initMenu: 'crop',
                        uiSize: {
                            width: '100%',
                            height: '500px'
                        },
                        menuBarPosition: 'bottom'
                    },
                    cssMaxWidth: 800,
                    cssMaxHeight: 500,
                    usageStatistics: false
                });

                console.log('✅ TUI Image Editor instance created:', editorInstance);

                setEditor(editorInstance);
                setIsLoading(false);
                setLoadingStep('');

            } catch (error: any) {
                console.error('❌ TUI Image Editor failed to load:', error);
                setError(`Failed to load TUI Image Editor: ${error.message}`);
                setIsLoading(false);
                setLoadingStep('');
            }
        };

        // Add a small delay to ensure DOM is ready
        const timer = setTimeout(loadTuiEditor, 100);

        return () => {
            clearTimeout(timer);
            if (editor) {
                try {
                    editor.destroy();
                } catch (e) {
                    console.warn('Error destroying editor:', e);
                }
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
            editor.loadImageFromURL(source, 'ResetImage');
        } catch (error) {
            console.error('Error resetting image:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Loading TUI Image Editor</p>
                    <p className="text-sm text-muted-foreground mt-2">{loadingStep}</p>
                    <div className="mt-4 text-xs text-muted-foreground">
                        <p>This may take a moment on first load...</p>
                    </div>
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
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="px-2 py-1 text-xs bg-green-100 text-green-800 border border-green-200 rounded">
                        TUI Image Editor Active
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
                style={{
                    paddingTop: '70px',
                    minHeight: '500px'
                }}
            />
        </div>
    );
};

export default TuiImageEditorSimple;