'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { useLayout } from '@/providers/LayoutProvider';
import { motion } from 'framer-motion';
import Search from '@/components/home/Search';
import HomeSlider from '@/components/home/HomeSlider';

// Lazy load components
const LatestTour = lazy(() => import('@/components/home/LatestTour'));
const TourByPricing = lazy(() => import('@/components/home/TourByPricing'));
const WhyUs = lazy(() => import('@/components/home/WhyUs'));
const ExploreCategories = lazy(() => import('@/components/home/ExploreCategories'));
const DestinationTour = lazy(() => import('@/components/home/DestinationTour'));
const ReviewSlider = lazy(() => import('@/components/home/ReviewSlider'));
const RecentBlog = lazy(() => import('@/components/home/RecentBlog'));

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6 }
    }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
};

// Loading skeleton component
const SectionSkeleton = () => (
    <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />
);

export default function HomePage() {
    const { isFullWidth } = useLayout();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <>
            {/* Hero Section with Slider and Search */}
            <div className="relative">
                {/* Slider Component */}
                <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
                    <HomeSlider />
                </div>

                {/* Search Box Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 h-full relative transition-all duration-300`}>
                        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-[400px] z-10 hidden md:block pointer-events-auto">
                            <div className="bg-secondary/70 backdrop-blur-xs rounded-lg p-5 shadow-lg border border-secondary/20">
                                <h2 className="text-primary text-xl font-bold mb-4 uppercase">SEARCH TOURS</h2>
                                <Search />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Search (shown below slider on mobile) */}
                <div className="md:hidden py-6 px-4 bg-secondary">
                    <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} transition-all duration-300`}>
                        <h2 className="text-primary text-xl font-bold mb-4 uppercase">SEARCH TOURS</h2>
                        <Search />
                    </div>
                </div>
            </div>

            {/* Featured Tours Section */}
            <motion.div
                className="py-16"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
            >
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                        variants={staggerContainer}
                    >
                        <motion.div className="col-span-2" variants={fadeInUp}>
                            <Suspense fallback={<SectionSkeleton />}>
                                <LatestTour />
                            </Suspense>
                        </motion.div>
                        <motion.div className="col-span-1" variants={fadeInUp}>
                            <Suspense fallback={<SectionSkeleton />}>
                                <TourByPricing />
                            </Suspense>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Why Choose Us Section */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
            >
                <Suspense fallback={<SectionSkeleton />}>
                    <WhyUs />
                </Suspense>
            </motion.div>

            {/* Explore Categories Section */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
            >
                <Suspense fallback={<SectionSkeleton />}>
                    <ExploreCategories />
                </Suspense>
            </motion.div>

            {/* Popular Destinations Section */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
            >
                <Suspense fallback={<SectionSkeleton />}>
                    <DestinationTour />
                </Suspense>
            </motion.div>

            {/* Customer Reviews Section */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
            >
                <Suspense fallback={<SectionSkeleton />}>
                    <ReviewSlider />
                </Suspense>
            </motion.div>

            {/* Recent Blog Posts */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
            >
                <Suspense fallback={<SectionSkeleton />}>
                    <RecentBlog />
                </Suspense>
            </motion.div>
        </>
    );
}
