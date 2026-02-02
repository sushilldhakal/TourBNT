'use client';

import dynamic from 'next/dynamic';

const carouselModule = () => import('@/components/ui/carousel');

/** Lazy-loaded Carousel (embla-carousel chunk ~40KB). Use these in place of @/components/ui/carousel to code-split. */
export const Carousel = dynamic(
  () => carouselModule().then((m) => ({ default: m.Carousel })),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse rounded-lg bg-muted" /> }
);

export const CarouselContent = dynamic(
  () => carouselModule().then((m) => ({ default: m.CarouselContent })),
  { ssr: false }
);

export const CarouselItem = dynamic(
  () => carouselModule().then((m) => ({ default: m.CarouselItem })),
  { ssr: false }
);

export const CarouselPrevious = dynamic(
  () => carouselModule().then((m) => ({ default: m.CarouselPrevious })),
  { ssr: false }
);

export const CarouselNext = dynamic(
  () => carouselModule().then((m) => ({ default: m.CarouselNext })),
  { ssr: false }
);

export type { CarouselApi } from '@/components/ui/carousel';
