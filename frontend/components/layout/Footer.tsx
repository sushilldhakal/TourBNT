'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLayout } from '@/providers/LayoutProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { getCompanyInfo, subscribe } from '@/lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';

export function Footer() {
    const { isFullWidth } = useLayout();
    const [email, setEmail] = useState('');
    const [isSubscriberFixed, setIsSubscriberFixed] = useState(false);
    const { toast } = useToast();
    const footerRef = useRef<HTMLElement>(null);

    // Fetch company info
    const { data: companyInfo, isLoading } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: getCompanyInfo,
    });

    const mutation = useMutation({
        mutationFn: (email: string) => subscribe({ email: [email] }),
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Subscribed successfully!',
            });
            setEmail(''); // Clear the input field
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: 'Error',
                description: `Subscription failed: ${error.message}`,
                action: <ToastAction altText="Try again">Try again</ToastAction>,
            });
        }
    });

    // Scroll detection to make subscriber bar fixed when reaching bottom of footer
    useEffect(() => {
        const handleScroll = () => {
            if (footerRef.current) {
                const footerRect = footerRef.current.getBoundingClientRect();
                const footerBottom = footerRect.bottom;
                const windowHeight = window.innerHeight;

                // Make subscriber bar fixed when footer bottom reaches viewport bottom
                // This triggers when you scroll to the end of the footer
                if (footerBottom <= windowHeight) {
                    setIsSubscriberFixed(true);
                } else {
                    setIsSubscriberFixed(false);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial position

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSubscribe = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (email.trim() === '') return; // Prevent empty submissions
        mutation.mutate(email);
    };

    // Loading state
    if (isLoading) {
        return (
            <footer className="relative z-20 bg-secondary pt-20 pb-5 lg:pt-[120px] lg:pb-5">
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                    <p className="text-center text-muted-foreground">Loading...</p>
                </div>
            </footer>
        );
    }

    return (
        <>
            <footer ref={footerRef} className="relative z-20 bg-secondary pt-20 pb-5 lg:pt-[120px] lg:pb-5">
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                    <div className="flex flex-wrap -mx-4">
                        {/* Company Info */}
                        <div className="w-full px-4 sm:w-1/2 lg:w-3/12">
                            <div className="mb-10 w-full">
                                <Link href="/" className="mb-6 inline-block max-w-[160px]">
                                    <span className="text-2xl font-bold text-primary">{companyInfo?.companyName}</span>
                                </Link>
                                <p className="mb-7 text-base text-muted-foreground">
                                    {companyInfo?.description}
                                </p>
                                <p className="flex items-center text-sm font-medium text-foreground">
                                    <span className="mr-3 text-primary">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <g clipPath="url(#clip0_941_15626)">
                                                <path
                                                    d="M15.1875 19.4688C14.3438 19.4688 13.375 19.25 12.3125 18.8438C10.1875 18 7.84377 16.375 5.75002 14.2813C3.65627 12.1875 2.03127 9.84377 1.18752 7.68752C0.250019 5.37502 0.343769 3.46877 1.43752 2.40627C1.46877 2.37502 1.53127 2.34377 1.56252 2.31252L4.18752 0.750025C4.84377 0.375025 5.68752 0.562525 6.12502 1.18752L7.96877 3.93753C8.40627 4.59378 8.21877 5.46877 7.59377 5.90627L6.46877 6.68752C7.28127 8.00002 9.59377 11.2188 13.2813 13.5313L13.9688 12.5313C14.5 11.7813 15.3438 11.5625 16.0313 12.0313L18.7813 13.875C19.4063 14.3125 19.5938 15.1563 19.2188 15.8125L17.6563 18.4375C17.625 18.5 17.5938 18.5313 17.5625 18.5625C17 19.1563 16.1875 19.4688 15.1875 19.4688ZM2.37502 3.46878C1.78127 4.12503 1.81252 5.46877 2.50002 7.18752C3.28127 9.15627 4.78127 11.3125 6.75002 13.2813C8.68752 15.2188 10.875 16.7188 12.8125 17.5C14.5 18.1875 15.8438 18.2188 16.5313 17.625L18.0313 15.0625C18.0313 15.0313 18.0313 15.0313 18.0313 15L15.2813 13.1563C15.2813 13.1563 15.2188 13.1875 15.1563 13.2813L14.4688 14.2813C14.0313 14.9063 13.1875 15.0938 12.5625 14.6875C8.62502 12.25 6.18752 8.84377 5.31252 7.46877C4.90627 6.81252 5.06252 5.96878 5.68752 5.53128L6.81252 4.75002V4.71878L4.96877 1.96877C4.96877 1.93752 4.93752 1.93752 4.90627 1.96877L2.37502 3.46878Z"
                                                    fill="currentColor"
                                                />
                                                <path
                                                    d="M18.3125 8.90633C17.9375 8.90633 17.6563 8.62508 17.625 8.25008C17.375 5.09383 14.7813 2.56258 11.5938 2.34383C11.2188 2.31258 10.9063 2.00008 10.9375 1.59383C10.9688 1.21883 11.2813 0.906333 11.6875 0.937583C15.5625 1.18758 18.7188 4.25008 19.0313 8.12508C19.0625 8.50008 18.7813 8.84383 18.375 8.87508C18.375 8.90633 18.3438 8.90633 18.3125 8.90633Z"
                                                    fill="currentColor"
                                                />
                                                <path
                                                    d="M15.2187 9.18755C14.875 9.18755 14.5625 8.93755 14.5312 8.56255C14.3437 6.87505 13.0312 5.56255 11.3437 5.3438C10.9687 5.31255 10.6875 4.93755 10.7187 4.56255C10.75 4.18755 11.125 3.9063 11.5 3.93755C13.8437 4.2188 15.6562 6.0313 15.9375 8.37505C15.9687 8.75005 15.7187 9.0938 15.3125 9.1563C15.25 9.18755 15.2187 9.18755 15.2187 9.18755Z"
                                                    fill="currentColor"
                                                />
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_941_15626">
                                                    <rect width="20" height="20" fill="white" />
                                                </clipPath>
                                            </defs>
                                        </svg>
                                    </span>
                                    <span>{companyInfo?.contactPhone}</span>
                                </p>
                            </div>
                        </div>

                        {/* Resources */}
                        <div className="w-full px-4 sm:w-1/2 lg:w-3/12">
                            <div className="mb-10 w-full">
                                <h4 className="mb-9 text-lg font-semibold text-foreground">
                                    Resources
                                </h4>
                                <ul className="space-y-3">
                                    {companyInfo?.resources.map((resource, index) => (
                                        <li key={`resource-${index}`}>
                                            <Link
                                                href={resource.link}
                                                className="inline-block text-base leading-loose text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {resource.title}
                                            </Link>
                                        </li>
                                    ))}
                                    <li>
                                        <Link
                                            href="/apply-seller"
                                            className="inline-block text-base leading-loose text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            Apply to become a Seller
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="w-full px-4 sm:w-1/2 lg:w-3/12">
                            <div className="mb-10 w-full">
                                <h4 className="mb-9 text-lg font-semibold text-foreground">
                                    Quick Links
                                </h4>
                                <ul className="space-y-3">
                                    {companyInfo?.quickLinks.map((link, index) => (
                                        <li key={`quicklink-${index}`}>
                                            <Link
                                                href={link.link}
                                                className="inline-block text-base leading-loose text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {link.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Social Media & Newsletter */}
                        <div className="w-full px-4 sm:w-1/2 lg:w-3/12" >
                            <div className="mb-10 w-full">
                                <h4 className="mb-9 text-lg font-semibold text-foreground">
                                    Follow Us On
                                </h4>
                                <div className="mb-6 flex items-center">
                                    {companyInfo?.socialMedia.map((social, index) => (
                                        <a
                                            key={`social-${index}`}
                                            href={social.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mr-3 flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all sm:mr-4 lg:mr-3 xl:mr-4"
                                        >
                                            {social.icon === 'facebook' && (
                                                <svg
                                                    width="8"
                                                    height="16"
                                                    viewBox="0 0 8 16"
                                                    className="fill-current"
                                                >
                                                    <path d="M7.43902 6.4H6.19918H5.75639V5.88387V4.28387V3.76774H6.19918H7.12906C7.3726 3.76774 7.57186 3.56129 7.57186 3.25161V0.516129C7.57186 0.232258 7.39474 0 7.12906 0H5.51285C3.76379 0 2.54609 1.44516 2.54609 3.5871V5.83226V6.34839H2.10329H0.597778C0.287819 6.34839 0 6.63226 0 7.04516V8.90323C0 9.26452 0.243539 9.6 0.597778 9.6H2.05902H2.50181V10.1161V15.3032C2.50181 15.6645 2.74535 16 3.09959 16H5.18075C5.31359 16 5.42429 15.9226 5.51285 15.8194C5.60141 15.7161 5.66783 15.5355 5.66783 15.3806V10.1419V9.62581H6.13276H7.12906C7.41688 9.62581 7.63828 9.41935 7.68256 9.10968V9.08387V9.05806L7.99252 7.27742C8.01466 7.09677 7.99252 6.89032 7.85968 6.68387C7.8154 6.55484 7.61614 6.42581 7.43902 6.4Z" />
                                                </svg>
                                            )}
                                            {social.icon === 'twitter' && (
                                                <svg
                                                    width="16"
                                                    height="12"
                                                    viewBox="0 0 16 12"
                                                    className="fill-current"
                                                >
                                                    <path d="M14.2194 2.06654L15.2 0.939335C15.4839 0.634051 15.5613 0.399217 15.5871 0.2818C14.8129 0.704501 14.0903 0.845401 13.6258 0.845401H13.4452L13.3419 0.751468C12.7226 0.258317 11.9484 0 11.1226 0C9.31613 0 7.89677 1.36204 7.89677 2.93542C7.89677 3.02935 7.89677 3.17025 7.92258 3.26419L8 3.73386L7.45806 3.71037C4.15484 3.61644 1.44516 1.03327 1.00645 0.587084C0.283871 1.76125 0.696774 2.88845 1.13548 3.59296L2.0129 4.90802L0.619355 4.20352C0.645161 5.18982 1.05806 5.96477 1.85806 6.52838L2.55484 6.99804L1.85806 7.25636C2.29677 8.45401 3.27742 8.94716 4 9.13503L4.95484 9.36986L4.05161 9.93346C2.60645 10.8728 0.8 10.8024 0 10.7319C1.62581 11.7652 3.56129 12 4.90323 12C5.90968 12 6.65806 11.9061 6.83871 11.8356C14.0645 10.2857 14.4 4.41487 14.4 3.2407V3.07632L14.5548 2.98239C15.4323 2.23092 15.7935 1.8317 16 1.59687C15.9226 1.62035 15.8194 1.66732 15.7161 1.6908L14.2194 2.06654Z" />
                                                </svg>
                                            )}
                                            {social.icon === 'instagram' && (
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    className="fill-current"
                                                >
                                                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
                                                </svg>
                                            )}
                                            {social.icon === 'linkedin' && (
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 14 14"
                                                    className="fill-current"
                                                >
                                                    <path d="M13.0214 0H1.02084C0.453707 0 0 0.451613 0 1.01613V12.9839C0 13.5258 0.453707 14 1.02084 14H12.976C13.5432 14 13.9969 13.5484 13.9969 12.9839V0.993548C14.0422 0.451613 13.5885 0 13.0214 0ZM4.15142 11.9H2.08705V5.23871H4.15142V11.9ZM3.10789 4.3871C2.42733 4.3871 1.90557 3.83548 1.90557 3.18064C1.90557 2.51613 2.45002 1.96452 3.10789 1.96452C3.76577 1.96452 4.31022 2.51613 4.31022 3.18064C4.31022 3.83548 3.81114 4.3871 3.10789 4.3871ZM11.9779 11.9H9.9135V8.67097C9.9135 7.83548 9.89082 6.77419 8.82461 6.77419C7.73571 6.77419 7.57691 7.6129 7.57691 8.47742V11.9H5.51254V5.23871H7.53154V6.16452H7.55423C7.84914 5.62258 8.50701 5.08065 9.52785 5.08065C11.6376 5.08065 12.0232 6.43548 12.0232 8.2871V11.9H11.9779Z" />
                                                </svg>
                                            )}
                                        </a>
                                    ))}
                                </div>

                                {/* Newsletter */}
                                <form onSubmit={handleSubscribe} className="w-full">
                                    <h4 className="mb-3 text-lg font-semibold text-foreground">
                                        Newsletter
                                    </h4>
                                    <p className="mb-4 text-base text-muted-foreground">
                                        Subscribe to receive travel tips and exclusive offers.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            type="email"
                                            placeholder="Your email"
                                            className="flex-1 rounded-md bg-background border-border"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <Button
                                            type="submit"
                                            variant="default"
                                            disabled={mutation.isPending}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                                        >
                                            {mutation.isPending ? 'Subscribing...' : 'Subscribe'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-12 border-t border-border">
                    <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 transition-all duration-300`}>
                        <div className="py-8">
                            <p className="text-center text-base text-muted-foreground">
                                &copy; {new Date().getFullYear()} {companyInfo?.companyName}. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Subscriber Component - Fixed when footer is in view */}
            <div
                className={`w-full min-h-[400px] md:min-h-[500px] flex items-center justify-center relative transition-all duration-300 ${isSubscriberFixed ? 'sticky bottom-0 left-0 right-0 z-0' : 'relative'
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
                <div className={`mx-auto ${isFullWidth ? 'max-w-full' : 'max-w-7xl'} px-4 relative z-10`}>
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
                </div>
            </div>
        </>
    );
}
