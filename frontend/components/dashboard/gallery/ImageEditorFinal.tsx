'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';

interface ImageEditorFinalProps {
    source: string;
    onSave: (editedImageObject: any) => void;
    onClose: () => void;
}

// Simple editor - always works
const SimpleImageEditor = dynamic(
    () => import('./SimpleImageEditor'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-[600px] w-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading image editor...</p>
                </div>
            </div>
        ),
    }
);

const ImageEditorFinal = ({ source, onSave, onClose }: ImageEditorFinalProps) => {
    const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = source;
        link.download = 'image';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenInNewTab = () => {
        window.open(source, '_blank');
    };

    return (
        <div className="relative">
            {/* Header with status and actions */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded shadow-sm">
                        HTML5 Canvas Editor
                    </div>
                    <button
                        onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
                        className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 border border-yellow-200 rounded shadow-sm hover:bg-yellow-200"
                    >
                        <Icon name="lu:LuInfo" size={12} className="mr-1" />
                        Why no advanced editor?
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                        <Icon name="lu:LuExternalLink" size={14} className="mr-1" />
                        Open in New Tab
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Icon name="lu:LuDownload" size={14} className="mr-1" />
                        Download
                    </Button>
                </div>
            </div>

            {/* Info panel */}
            {showAdvancedInfo && (
                <div className="absolute top-16 left-4 right-4 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md">
                    <div className="space-y-3">
                        <div className="flex items-start gap-2">
                            <Icon name="lu:LuAlertTriangle" size={16} className="text-yellow-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-sm">Advanced Editor Unavailable</h4>
                                <p className="text-xs text-gray-600 mt-1">
                                    Advanced image editors have compatibility issues with React 18 and Next.js.
                                </p>
                            </div>
                        </div>

                        <div className="text-xs space-y-2">
                            <div>
                                <strong>Current Solution:</strong>
                                <ul className="list-disc list-inside ml-2 text-gray-600">
                                    <li>HTML5 Canvas-based editor</li>
                                    <li>Basic adjustments & transforms</li>
                                    <li>Fully compatible with React 18</li>
                                </ul>
                            </div>

                            <div>
                                <strong>For Advanced Editing:</strong>
                                <ul className="list-disc list-inside ml-2 text-gray-600">
                                    <li>Download image and use external tools</li>
                                    <li>Photoshop, GIMP, Canva, etc.</li>
                                    <li>Re-upload edited version</li>
                                </ul>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowAdvancedInfo(false)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Got it, close this
                        </button>
                    </div>
                </div>
            )}

            {/* Simple editor */}
            <SimpleImageEditor source={source} onSave={onSave} onClose={onClose} />
        </div>
    );
};

export default ImageEditorFinal;