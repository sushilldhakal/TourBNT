'use client';

import Link from 'next/link';
import NotFoundSVG from '@/components/icons/NotFoundSVG';
import { motion } from 'motion/react';

export function NotFoundContent() {
    return (
        <div className="not-found-page w-full max-w-7xl mx-auto px-4 py-16 transition-all duration-300">
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
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
                        Oops! The page you&apos;re looking for seems to have wandered off on its own adventure.
                    </p>

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
    );
}
