'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ModeToggle() {
    const { setTheme, resolvedTheme } = useTheme();
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (typeof document === 'undefined') return;

        const isDark = resolvedTheme === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';

        // So the circular reveal animation expands from the click point
        document.documentElement.style.setProperty('--click-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--click-y', `${event.clientY}px`);

        const anyDocument = document as Document & { startViewTransition?: (cb: () => void | Promise<void>) => void };

        if (typeof anyDocument.startViewTransition === 'function') {
            anyDocument.startViewTransition(() => {
                // Apply class immediately so the new theme is visible in this frame.
                // Prevents blink: next-themes would update in the next tick, so the
                // transition would capture the old theme then flash when class applied.
                if (nextTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                setTheme(nextTheme);
            });
        } else {
            setTheme(nextTheme);
        }
    };

    return (
        <Button
            ref={buttonRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="focus-visible:ring-0 focus-visible:ring-offset-0 relative overflow-hidden transition-colors duration-300"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
