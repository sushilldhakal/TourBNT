/**
 * Gallery URL Synchronization Example
 * 
 * This example demonstrates how the gallery's URL synchronization works.
 * It shows how to navigate to specific tabs programmatically and how
 * the URL updates when users interact with the gallery.
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GalleryURLExample() {
    const router = useRouter();

    const navigateToTab = (tab: 'images' | 'videos' | 'pdfs') => {
        router.push(`/dashboard/gallery?tab=${tab}`);
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Gallery URL Navigation Example</CardTitle>
                <CardDescription>
                    Click the buttons below to navigate to different gallery tabs.
                    Notice how the URL updates and the browser back/forward buttons work.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Direct Navigation</h3>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => navigateToTab('images')}
                            variant="outline"
                        >
                            Go to Images Tab
                        </Button>
                        <Button
                            onClick={() => navigateToTab('videos')}
                            variant="outline"
                        >
                            Go to Videos Tab
                        </Button>
                        <Button
                            onClick={() => navigateToTab('pdfs')}
                            variant="outline"
                        >
                            Go to PDFs Tab
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Shareable URLs</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                            <code className="bg-muted px-1 py-0.5 rounded">
                                /dashboard/gallery?tab=images
                            </code>
                        </p>
                        <p>
                            <code className="bg-muted px-1 py-0.5 rounded">
                                /dashboard/gallery?tab=videos
                            </code>
                        </p>
                        <p>
                            <code className="bg-muted px-1 py-0.5 rounded">
                                /dashboard/gallery?tab=pdfs
                            </code>
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Features</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>URL updates automatically when switching tabs</li>
                        <li>Browser back/forward buttons work correctly</li>
                        <li>Shareable links open to the correct tab</li>
                        <li>Defaults to images tab if no parameter is present</li>
                        <li>Selection clears when navigating between tabs</li>
                    </ul>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Try It Out</h3>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Click one of the navigation buttons above</li>
                        <li>Switch between tabs in the gallery</li>
                        <li>Use your browser's back button</li>
                        <li>Notice how the tab changes match your navigation history</li>
                    </ol>
                </div>
            </CardContent>
        </Card>
    );
}
