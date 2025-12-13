'use client';

import { useEffect, useState } from 'react';

interface ImageEditorWrapperProps {
    source: string;
    onSave: (editedImageObject: any) => void;
    onClose: () => void;
}

export default function ImageEditorWrapper({ source, onSave, onClose }: ImageEditorWrapperProps) {
    const [Editor, setEditor] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadEditor = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Dynamic import with proper error handling
                const module = await import('react-filerobot-image-editor');

                if (mounted) {
                    setEditor(() => module.default);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Failed to load image editor:', err);
                if (mounted) {
                    setError('Failed to load image editor. Please try again.');
                    setIsLoading(false);
                }
            }
        };

        loadEditor();

        return () => {
            mounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading image editor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center text-red-500">
                    <p>{error}</p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    if (!Editor) {
        return null;
    }

    return (
        <Editor
            source={source}
            onSave={onSave}
            onClose={onClose}
            annotationsCommon={{
                fill: '#ff0000',
            }}
            Text={{ text: 'Filerobot...' }}
            Rotate={{ angle: 90, componentType: 'slider' }}
            Crop={{
                presetsItems: [
                    {
                        titleKey: 'classicTv',
                        descriptionKey: '4:3',
                        ratio: 4 / 3,
                    },
                    {
                        titleKey: 'cinemascope',
                        descriptionKey: '21:9',
                        ratio: 21 / 9,
                    },
                ],
                presetsFolders: [
                    {
                        titleKey: 'socialMedia',
                        groups: [
                            {
                                titleKey: 'facebook',
                                items: [
                                    {
                                        titleKey: 'profile',
                                        width: 180,
                                        height: 180,
                                        descriptionKey: 'fbProfileSize',
                                    },
                                    {
                                        titleKey: 'coverPhoto',
                                        width: 820,
                                        height: 312,
                                        descriptionKey: 'fbCoverPhotoSize',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }}
            tabsIds={['Adjust', 'Annotate', 'Filters', 'Finetune', 'Resize', 'Watermark']}
            defaultTabId="Adjust"
            defaultToolId="Crop"
        />
    );
}
