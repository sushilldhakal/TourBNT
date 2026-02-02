'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const HomePageContent = dynamic(
    () => import('@/components/home/HomePageContent').then((m) => ({ default: m.HomePageContent })),
    { ssr: false }
);

export default function HomePage() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setTimeout(() => setIsLoaded(true), 0);
    }, []);

    return <HomePageContent isLoaded={isLoaded} />;
}
