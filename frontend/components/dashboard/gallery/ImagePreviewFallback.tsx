'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon';

interface ImagePreviewFallbackProps {
    source: string;
    onClose: () => void;
}

export default function ImagePreviewFallback({ source, onClose }: ImagePreviewFallbackProps) {
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
        <div className="flex flex-col h-[600px] w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Image Preview</h3>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                    <Icon name="lu:LuX" size={20} />
                </Button>
            </div>

            {/* Image Preview */}
            <div className="flex-1 relative bg-muted/50 flex items-center justify-center p-4">
                <div className="relative max-w-full max-h-full">
                    <Image
                        src={source}
                        alt="Image preview"
                        width={800}
                        height={600}
                        className="object-contain max-w-full max-h-full"
                        style={{ maxHeight: '500px' }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-background">
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={handleOpenInNewTab}>
                        <Icon name="lu:LuExternalLink" size={16} className="mr-2" />
                        Open in New Tab
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                        <Icon name="lu:LuDownload" size={16} className="mr-2" />
                        Download
                    </Button>
                </div>
                <div className="mt-3 text-center">
                    <p className="text-sm text-muted-foreground">
                        Image editor is temporarily unavailable due to compatibility issues.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        You can download the image and edit it with external tools.
                    </p>
                </div>
            </div>
        </div>
    );
}