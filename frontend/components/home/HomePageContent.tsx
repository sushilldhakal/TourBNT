'use client';

import { lazy, Suspense, useSyncExternalStore, type ReactNode } from 'react';
import { motion } from 'motion/react';
import Search from '@/components/home/Search';
import HomeSlider from '@/components/home/HomeSlider';
import { ContentContainer } from '@/components/layout/PublicLayoutClient';

const LatestTour = lazy(() => import('@/components/home/LatestTour'));
const TourByPricing = lazy(() => import('@/components/home/TourByPricing'));
const WhyUs = lazy(() => import('@/components/home/WhyUs'));
const ExploreCategories = lazy(() => import('@/components/home/ExploreCategories'));
const DestinationTour = lazy(() => import('@/components/home/DestinationTour'));
const ReviewSlider = lazy(() => import('@/components/home/ReviewSlider'));
const RecentBlog = lazy(() => import('@/components/home/RecentBlog'));

const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6 }
    }
};

const SectionSkeleton = () => (
    <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />
);

/**
 * Motion's initial="hidden" styles differ from the server HTML and cause a hydration mismatch.
 * The first paint is a plain div (same on server and client); the scroll animation starts after mount.
 */
function subscribe() {
    return () => {};
}

/** False during server render and hydration, true after the client takes over. */
function useAfterHydration() {
    return useSyncExternalStore(subscribe, () => true, () => false);
}

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
    const ready = useAfterHydration();
    if (!ready) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
        >
            {children}
        </motion.div>
    );
}

export function HomePageContent() {
    return (
        <>
            <div className="relative">
                <div>
                    <HomeSlider />
                </div>
                <div className="absolute inset-0 pointer-events-none">
                    <ContentContainer className="w-full px-4 h-full relative transition-all duration-300">
                        <div className="absolute top-1/2 right-10 transform -translate-y-1/2 w-[400px] z-10 hidden md:block pointer-events-auto">
                            <div className="bg-secondary/70 backdrop-blur-xs rounded-lg p-5 shadow-lg border border-secondary/20">
                                <h2 className="text-primary text-xl font-bold mb-4 uppercase">SEARCH TOURS</h2>
                                <Search />
                            </div>
                        </div>
                    </ContentContainer>
                </div>
                <div className="md:hidden py-6 px-4 bg-secondary">
                    <div className="w-full transition-all duration-300">
                        <h2 className="text-primary text-xl font-bold mb-4 uppercase">SEARCH TOURS</h2>
                        <Search />
                    </div>
                </div>
            </div>

            <Reveal className="py-16">
                <div className="w-full px-4 transition-all duration-300">
                    <ContentContainer>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="col-span-2">
                                <Suspense fallback={<SectionSkeleton />}>
                                    <LatestTour />
                                </Suspense>
                            </div>
                            <div className="col-span-1">
                                <Suspense fallback={<SectionSkeleton />}>
                                    <TourByPricing />
                                </Suspense>
                            </div>
                        </div>
                    </ContentContainer>
                </div>
            </Reveal>

            <Reveal>
                <Suspense fallback={<SectionSkeleton />}>
                    <WhyUs />
                </Suspense>
            </Reveal>

            <Reveal>
                <Suspense fallback={<SectionSkeleton />}>
                    <ExploreCategories />
                </Suspense>
            </Reveal>

            <Reveal>
                <Suspense fallback={<SectionSkeleton />}>
                    <DestinationTour />
                </Suspense>
            </Reveal>

            <Reveal>
                <Suspense fallback={<SectionSkeleton />}>
                    <ReviewSlider />
                </Suspense>
            </Reveal>

            <Reveal>
                <Suspense fallback={<SectionSkeleton />}>
                    <RecentBlog />
                </Suspense>
            </Reveal>
        </>
    );
}
