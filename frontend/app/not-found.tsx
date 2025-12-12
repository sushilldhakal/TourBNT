'use client';

import Link from 'next/link';
import { useLayout } from '@/providers/LayoutProvider';
import NotFoundSVG from '@/public/404';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function NotFound() {
    const { isFullWidth } = useLayout();

    useEffect(() => {
        // Add motion animations to SVG elements after mount
        const zeroElement = document.querySelector('#zero');
        if (zeroElement) {
            (zeroElement as HTMLElement).style.transformOrigin = 'bottom center';
            (zeroElement as HTMLElement).style.transformBox = 'fill-box';
        }
    }, []);

    return (
        <>
            <style jsx global>{`
                #handboy {
                    animation: swing ease-in-out 1.3s infinite alternate;
                    transform-origin: 98% 98%;
                    transform-box: fill-box;
                }
                
                #girllight {
                    animation: swing ease-in-out 1.3s infinite alternate;
                    transform-origin: 0% 97%;
                    transform-box: fill-box;
                }
                
                #hairgirl {
                    animation: swinghair ease-in-out 1.3s infinite alternate;
                    transform-origin: 60% 0%;
                    transform-box: fill-box;
                }
                
                #zero {
                    transform-origin: bottom center;
                    transform-box: fill-box;
                    animation: zeroAnimation 3s ease-in-out infinite;
                }
                
                .animate-fade-in svg {
                    animation: svgFloat 2s ease-in-out infinite alternate;
                }
                
                /* Swing animation */
                @keyframes swing {
                    0% {
                        transform: rotate(10deg);
                    }
                    100% {
                        transform: rotate(-10deg);
                    }
                }
                
                /* Swing hair animation */
                @keyframes swinghair {
                    0% {
                        transform: rotate(6deg);
                    }
                    100% {
                        transform: rotate(-6deg);
                    }
                }
                
                /* SVG floating animation */
                @keyframes svgFloat {
                    0% {
                        transform: translateY(0px);
                    }
                    100% {
                        transform: translateY(10px);
                    }
                }
                
                /* Zero animation - scale, rotate, and translate */
                @keyframes zeroAnimation {
                    0% {
                        transform: translateX(0px) scale(1) rotateY(0deg);
                    }
                    25% {
                        transform: translateX(10px) scale(1.4) rotateY(0deg);
                    }
                    50% {
                        transform: translateX(10px) scale(1) rotateY(180deg);
                    }
                    75% {
                        transform: translateX(0px) scale(1) rotateY(180deg);
                    }
                    100% {
                        transform: translateX(0px) scale(1) rotateY(360deg);
                    }
                }
            `}</style>

            <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
                <div className="flex flex-col items-center justify-center min-h-[70vh]">
                    {/* 404 SVG Animation with Framer Motion */}
                    <motion.div
                        className="w-full max-w-2xl mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                            opacity: 1,
                            y: [20, 0, 10, 0],
                        }}
                        transition={{
                            opacity: { duration: 0.6 },
                            y: {
                                duration: 2,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                ease: 'easeInOut',
                            },
                        }}
                    >
                        <NotFoundSVG />
                    </motion.div>

                    {/* Error Message */}
                    <motion.div
                        className="text-center space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                            Page Not Found
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-md mx-auto">
                            Oops! The page you're looking for seems to have wandered off on its own adventure.
                        </p>

                        {/* Action Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                        >
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    href="/"
                                    className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition font-medium"
                                >
                                    Go Home
                                </Link>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    href="/tours"
                                    className="inline-block border border-primary text-primary px-8 py-3 rounded-lg hover:bg-accent transition font-medium"
                                >
                                    Browse Tours
                                </Link>
                            </motion.div>
                        </motion.div>

                        {/* Helpful Links */}
                        <div className="mt-12 pt-8 border-t border-border">
                            <p className="text-sm text-muted-foreground mb-4">
                                Looking for something specific? Try these popular pages:
                            </p>
                            <div className="flex flex-wrap justify-center gap-4 text-sm">
                                <Link href="/destinations" className="text-primary hover:text-primary/80">
                                    Destinations
                                </Link>
                                <span className="text-muted-foreground">•</span>
                                <Link href="/categories" className="text-primary hover:text-primary/80">
                                    Categories
                                </Link>
                                <span className="text-muted-foreground">•</span>
                                <Link href="/blog" className="text-primary hover:text-primary/80">
                                    Blog
                                </Link>
                                <span className="text-muted-foreground">•</span>
                                <Link href="/about" className="text-primary hover:text-primary/80">
                                    About Us
                                </Link>
                                <span className="text-muted-foreground">•</span>
                                <Link href="/contact" className="text-primary hover:text-primary/80">
                                    Contact
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
}
