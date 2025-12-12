'use client';

import { useLayout } from '@/providers/LayoutProvider';

export default function AboutPage() {
    const { isFullWidth } = useLayout();

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-6">About TourBNT</h1>

                <div className="prose max-w-none">
                    <p className="text-xl text-muted-foreground mb-8">
                        Your trusted partner in creating unforgettable travel experiences around the world.
                    </p>

                    <div className="bg-card border border-border rounded-lg p-8 mb-8">
                        <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
                        <p className="text-muted-foreground mb-4">
                            Founded in 2020, TourBNT has been dedicated to making travel accessible, enjoyable, and memorable for everyone.
                            We believe that travel is not just about visiting new places, but about creating lasting memories and connections.
                        </p>
                        <p className="text-muted-foreground">
                            Our team of experienced travel professionals works tirelessly to curate the best tours and experiences,
                            ensuring that every journey with us is exceptional.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-card border border-border rounded-lg p-6 text-center">
                            <div className="text-4xl font-bold text-primary mb-2">500+</div>
                            <p className="text-muted-foreground">Tours Available</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-6 text-center">
                            <div className="text-4xl font-bold text-primary mb-2">10K+</div>
                            <p className="text-muted-foreground">Happy Travelers</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-6 text-center">
                            <div className="text-4xl font-bold text-primary mb-2">50+</div>
                            <p className="text-muted-foreground">Destinations</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-8 mb-8">
                        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
                        <p className="text-muted-foreground">
                            To inspire and enable people to explore the world, discover new cultures, and create meaningful connections
                            through carefully crafted travel experiences that are sustainable, authentic, and transformative.
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-8">
                        <h2 className="text-2xl font-semibold mb-4">Why Choose Us?</h2>
                        <ul className="space-y-4">
                            <li className="flex items-start">
                                <span className="text-primary mr-3 text-xl">✓</span>
                                <div>
                                    <h3 className="font-semibold mb-1">Expert Guides</h3>
                                    <p className="text-muted-foreground">Local experts who know every corner of the destinations</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-3 text-xl">✓</span>
                                <div>
                                    <h3 className="font-semibold mb-1">Best Prices</h3>
                                    <p className="text-muted-foreground">Competitive pricing without compromising on quality</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-3 text-xl">✓</span>
                                <div>
                                    <h3 className="font-semibold mb-1">24/7 Support</h3>
                                    <p className="text-muted-foreground">Round-the-clock assistance for all your travel needs</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-3 text-xl">✓</span>
                                <div>
                                    <h3 className="font-semibold mb-1">Flexible Booking</h3>
                                    <p className="text-muted-foreground">Easy cancellation and modification policies</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
