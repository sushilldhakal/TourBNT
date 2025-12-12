'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { isVideo } from '@/lib/tourUtils';
import { GalleryItem } from '@/lib/types';
import { generateBlurDataURL, getImageSizes } from '@/lib/imageUtils';

interface TourGalleryProps {
    coverImage: string;
    gallery?: GalleryItem[];
    title: string;
}

interface MediaItem {
    image: string;
    alt: string;
    type: 'image' | 'video';
}

function VideoPlayer({ src, title }: { src: string; title?: string }) {
    return (
        <div className="relative w-full h-full bg-black">
            <video
                controls
                className="w-full h-full object-contain"
                preload="none"
                aria-label={title ? `Video: ${title}` : 'Tour video'}
            >
                <source src={src} type="video/mp4" />
                <source src={src} type="video/webm" />
                <source src={src} type="video/ogg" />
                <track kind="captions" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
}

export function TourGallery({ coverImage, gallery = [], title }: TourGalleryProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [api, setApi] = useState<CarouselApi>();

    // Combine cover image with gallery items
    const allMedia: MediaItem[] = [
        {
            image: coverImage,
            alt: title,
            type: isVideo(coverImage) ? 'video' as const : 'image' as const,
        },
        ...gallery.map((item): MediaItem => {
            const imageUrl = item.image || item.url || item.secure_url || '';
            return {
                image: imageUrl,
                alt: item.alt || title,
                type: isVideo(imageUrl) ? 'video' as const : 'image' as const,
            };
        }),
    ].filter(item => item.image); // Filter out empty images

    // Update current slide when carousel changes
    useEffect(() => {
        if (!api) return;

        const onSelect = () => {
            setCurrentSlide(api.selectedScrollSnap());
        };

        api.on('select', onSelect);
        onSelect(); // Set initial value

        return () => {
            api.off('select', onSelect);
        };
    }, [api]);

    const handleThumbnailClick = (index: number) => {
        if (api) {
            api.scrollTo(index);
        }
    };

    if (allMedia.length === 0) {
        return null;
    }

    return (
        <section className="bg-card border rounded-lg p-4 sm:p-6" aria-labelledby="gallery-heading">
            <h2 id="gallery-heading" className="text-xl sm:text-2xl font-bold mb-4">Gallery</h2>

            {/* Main Carousel */}
            <div className="relative mb-4" role="region" aria-label="Tour image gallery" aria-live="polite">
                <Carousel
                    setApi={setApi}
                    opts={{
                        align: 'start',
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent>
                        {allMedia.map((item, index) => (
                            <CarouselItem key={index} role="group" aria-label={`Slide ${index + 1} of ${allMedia.length}`}>
                                <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                                    {item.type === 'video' ? (
                                        <VideoPlayer src={item.image} title={item.alt} />
                                    ) : (
                                        <Image
                                            src={item.image}
                                            alt={item.alt}
                                            fill
                                            className="object-cover"
                                            sizes={getImageSizes('gallery')}
                                            priority={index === 0}
                                            loading={index === 0 ? 'eager' : 'lazy'}
                                            placeholder="blur"
                                            blurDataURL={generateBlurDataURL()}
                                        />
                                    )}
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {allMedia.length > 1 && (
                        <>
                            <CarouselPrevious
                                className="left-1 sm:left-2 h-8 w-8 sm:h-10 sm:w-10"
                                aria-label="Previous image"
                            />
                            <CarouselNext
                                className="right-1 sm:right-2 h-8 w-8 sm:h-10 sm:w-10"
                                aria-label="Next image"
                            />
                        </>
                    )}
                </Carousel>
            </div>

            {/* Thumbnail Navigation - 3 per row on mobile, 5 on desktop */}
            {allMedia.length > 1 && (
                <nav className="grid grid-cols-3 md:grid-cols-5 gap-2" aria-label="Gallery thumbnail navigation">
                    {allMedia.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => handleThumbnailClick(index)}
                            className={cn(
                                'relative aspect-video rounded-md overflow-hidden transition-all',
                                'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                // Minimum touch target size for mobile (44x44px)
                                'min-h-[44px]',
                                currentSlide === index
                                    ? 'ring-2 ring-primary opacity-100'
                                    : 'opacity-60'
                            )}
                            aria-label={`View ${item.alt} - slide ${index + 1}`}
                            aria-current={currentSlide === index ? 'true' : 'false'}
                        >
                            <div className="relative w-full h-full bg-muted">
                                {item.type === 'video' ? (
                                    <>
                                        <video
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                            muted
                                        >
                                            <source src={item.image} type="video/mp4" />
                                        </video>
                                        {/* Play icon overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <div className="bg-white/90 rounded-full p-1.5 sm:p-2" aria-hidden="true">
                                                <Play className="h-3 w-3 sm:h-4 sm:w-4 text-primary fill-primary" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <Image
                                        src={item.image}
                                        alt={item.alt}
                                        fill
                                        className="object-cover"
                                        sizes={getImageSizes('thumbnail')}
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL={generateBlurDataURL(200, 150)}
                                    />
                                )}
                            </div>
                        </button>
                    ))}
                </nav>
            )}
        </section>
    );
}
