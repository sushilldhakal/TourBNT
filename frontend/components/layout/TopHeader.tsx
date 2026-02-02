'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Twitter, Youtube, PhoneCall, Clock, Maximize2, Minimize2 } from 'lucide-react';
import { useLayout } from '@/providers/LayoutProvider';
import { Button } from '@/components/ui/button';
import { ContentContainer } from './PublicLayoutClient';

export function TopHeader() {
    const { isFullWidth, toggleLayout } = useLayout();
    const [isWideScreen, setIsWideScreen] = useState(false);

    // Only show layout toggle and apply full/boxed when screen is wider than 1600px
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1601px)');
        const update = () => setIsWideScreen(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return (
        <nav className="h-10 bg-secondary z-10 relative px-5">
            <ContentContainer className="w-full h-full transition-all duration-300">
                <div className="relative flex items-center justify-between h-full">
                    {/* Left Section - Layout Toggle & Phone Number & Opening Times */}
                    <div className="hidden md:flex items-center text-secondary-foreground text-xs space-x-4">

                        <span className="flex items-center">
                            <PhoneCall className="mr-2" size={18} />
                            +61 0433 926 079
                        </span>
                        <span className="flex items-center">
                            <Clock className="mr-2" size={18} />
                            Mon – Fri 8.00 – 18.00. Weekend CLOSED
                        </span>
                    </div>

                    {/* Welcome to TourBNT for small screens */}
                    <div className="md:hidden flex justify-center w-full">
                        <span className="text-secondary-foreground text-sm">Welcome to TourBNT</span>
                    </div>

                    {/* Right Section - Social Icons */}
                    <div className="hidden md:flex items-center space-x-2">
                        <Link
                            href="https://facebook.com"
                            className="p-1.5 text-primary bg-secondary-foreground rounded-md hover:bg-primary hover:text-white transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Facebook size={18} />
                        </Link>
                        <Link
                            href="https://instagram.com"
                            className="p-1.5 text-primary bg-secondary-foreground rounded-md hover:bg-primary hover:text-white transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Instagram size={18} />
                        </Link>
                        <Link
                            href="https://youtube.com"
                            className="p-1.5 text-primary bg-secondary-foreground rounded-md hover:bg-primary hover:text-white transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Youtube size={18} />
                        </Link>
                        <Link
                            href="https://twitter.com"
                            className="p-1.5 text-primary bg-secondary-foreground rounded-md hover:bg-primary hover:text-white transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Twitter size={18} />
                        </Link>
                        <Link
                            href="https://linkedin.com"
                            className="p-1.5 text-primary bg-secondary-foreground rounded-md hover:bg-primary hover:text-white transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Linkedin size={18} />
                        </Link>
                        {isWideScreen && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleLayout}
                                className="h-7 w-7 hover:bg-secondary-foreground/10"
                                title={isFullWidth ? 'Switch to Boxed Layout' : 'Switch to Full Width Layout'}
                            >
                                {isFullWidth ? (
                                    <Minimize2 size={16} className="text-secondary-foreground" />
                                ) : (
                                    <Maximize2 size={16} className="text-secondary-foreground" />
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </ContentContainer>
        </nav>
    );
}
