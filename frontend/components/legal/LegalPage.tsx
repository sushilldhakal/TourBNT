import type { ReactNode } from 'react';
import Link from 'next/link';

/** Shared shell for the legal / policy pages: title, last-updated line, a draft notice for the operator, content. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: ReactNode; children: ReactNode }) {
    return (
        <div className="w-full mx-auto px-4 py-12 md:py-16">
            <article className="max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
                <p className="text-sm text-muted-foreground mb-8">Last updated: {updated}</p>
                {intro && <div className="text-lg text-muted-foreground mb-10 leading-relaxed">{intro}</div>}
                <div className="space-y-10">{children}</div>
                <nav aria-label="Related policies" className="mt-14 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <Link className="text-primary hover:underline" href="/terms">Terms of Service</Link>
                    <Link className="text-primary hover:underline" href="/privacy">Privacy Policy</Link>
                    <Link className="text-primary hover:underline" href="/cookies">Cookie Policy</Link>
                    <Link className="text-primary hover:underline" href="/refund-policy">Cancellation &amp; Refund Policy</Link>
                    <Link className="text-primary hover:underline" href="/help">Help Center</Link>
                </nav>
            </article>
        </div>
    );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24">
            <h2 className="text-xl md:text-2xl font-semibold mb-3">{title}</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a:hover]:underline [&_strong]:text-foreground">
                {children}
            </div>
        </section>
    );
}
