"use client";

import { useLayout } from '@/providers/LayoutProvider';
import { BookOpen, CheckCircle, Lightbulb, DollarSign } from 'lucide-react';

export default function WhyUs() {
    const { isFullWidth } = useLayout();

    const features = [
        {
            icon: <BookOpen className="w-12 h-12 text-primary" />,
            title: "One Stop Book",
            description: "Widest range of tours and activities from all around the world to give you the best."
        },
        {
            icon: <CheckCircle className="w-12 h-12 text-primary" />,
            title: "Verified Reviews",
            description: "We verify all reviews to give you the best advice from trusted other travelers."
        },
        {
            icon: <Lightbulb className="w-12 h-12 text-primary" />,
            title: "Secret Travel Tips",
            description: "Join thousands of subscribers and get weekly travel tips from other travelers and locals."
        },
        {
            icon: <DollarSign className="w-12 h-12 text-primary" />,
            title: "Best Price Guarantee",
            description: "Our pricing is updated constantly to ensure you get the best price available online or at your destination."
        }
    ];

    return (
        <div
            className="relative w-full py-20 bg-cover bg-center bg-fixed overflow-hidden"
            style={{
                backgroundImage: `url('/subscriber.jpg')`,
            }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Content */}
            <div className={`relative z-10 mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                <h2 className="text-white text-3xl text-center font-bold mb-12">Why Book with Us?</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="text-center group hover:transform hover:scale-105 transition-all duration-300"
                        >
                            <div className="w-20 h-20 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-white text-lg font-bold mb-3">{feature.title}</h3>
                            <p className="text-white/90 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
