declare module 'tui-image-editor' {
    interface ImageEditorOptions {
        includeUI?: {
            loadImage?: {
                path: string;
                name: string;
            };
            theme?: Record<string, string>;
            menu?: string[];
            initMenu?: string;
            uiSize?: {
                width: string | number;
                height: string | number;
            };
            menuBarPosition?: 'top' | 'bottom' | 'left' | 'right';
        };
        cssMaxWidth?: number;
        cssMaxHeight?: number;
        usageStatistics?: boolean;
    }

    class ImageEditor {
        constructor(element: HTMLElement, options?: ImageEditorOptions);
        loadImageFromURL(url: string, name: string): Promise<any>;
        toDataURL(options?: { format?: string; quality?: number }): string;
        destroy(): void;
    }

    export default ImageEditor;
}