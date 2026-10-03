// components/layout/SubscriberBanner.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContentContainer } from './PublicLayoutClient';
import type { UseMutationResult } from '@tanstack/react-query';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

interface SubscriberBannerProps {
    email: string;
    setEmail: (email: string) => void;
    handleSubscribe: (event: React.FormEvent<HTMLFormElement>) => void;
    mutation: UseMutationResult<any, Error, string, unknown>;
    isFixed: boolean;
}

export default function SubscriberBanner({
    email,
    setEmail,
    handleSubscribe,
    mutation,
    isFixed
}: SubscriberBannerProps) {
    return (
        <div
            className={`w-full min-h-[400px] md:min-h-[500px] flex items-center justify-center relative transition-all duration-300 ${isFixed ? 'sticky bottom-0 left-0 right-0 z-0' : 'relative'
                }`}
            style={{
                backgroundImage: 'url(/subscriber.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-primary/80"></div>

            {/* Content */}
            <ContentContainer className="px-4 relative z-10">
                <div className="flex flex-col items-center justify-center gap-8 text-center">
                    {/* Text */}
                    <div className="text-primary-foreground">
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            Subscribe to Our Newsletter
                        </h3>
                        <p className="text-primary-foreground/95 text-base md:text-lg lg:text-xl">
                            Get exclusive travel deals, tips, and destination guides delivered to your inbox!
                        </p>
                    </div>

                    {/* Subscribe Form */}
                    <form onSubmit={handleSubscribe} className="w-full max-w-md">
                        <div className="flex flex-col gap-4">
                            <Input
                                type="email"
                                placeholder="Enter your email address"
                                className="w-full bg-background border-border text-foreground placeholder:text-muted-foreground h-14 text-base px-6"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <TurnstileWidget />
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={mutation.isPending}
                                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold h-14 text-base"
                            >
                                {mutation.isPending ? 'Subscribing...' : 'Subscribe Now'}
                            </Button>
                        </div>
                    </form>
                </div>
            </ContentContainer>
        </div>
    );
}