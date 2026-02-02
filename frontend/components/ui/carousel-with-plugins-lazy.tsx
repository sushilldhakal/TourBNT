'use client';

import dynamic from 'next/dynamic';

const pluginsModule = () => import('@/components/ui/carousel-with-plugins');

/** Lazy Carousel + Autoplay (+ optional AutoScroll). One chunk for embla + plugins. */
export const CarouselWithPlugins = dynamic(
  () => pluginsModule().then((m) => ({ default: m.CarouselWithPlugins })),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse rounded-lg bg-muted" /> }
);

export const CarouselContent = dynamic(
  () => pluginsModule().then((m) => ({ default: m.CarouselContent })),
  { ssr: false }
);

export const CarouselItem = dynamic(
  () => pluginsModule().then((m) => ({ default: m.CarouselItem })),
  { ssr: false }
);

export const CarouselPrevious = dynamic(
  () => pluginsModule().then((m) => ({ default: m.CarouselPrevious })),
  { ssr: false }
);

export const CarouselNext = dynamic(
  () => pluginsModule().then((m) => ({ default: m.CarouselNext })),
  { ssr: false }
);

export type { CarouselApi } from '@/components/ui/carousel-with-plugins';
